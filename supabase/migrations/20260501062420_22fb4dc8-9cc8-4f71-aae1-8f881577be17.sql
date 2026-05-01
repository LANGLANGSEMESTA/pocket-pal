-- ============ ENUM ROLE ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');

-- ============ PROFILES: username + email ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_handle text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- backfill email dari auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- backfill username_handle dari username lama (lowercase, hanya alphanumeric+underscore)
UPDATE public.profiles
SET username_handle = lower(regexp_replace(coalesce(username, 'user'), '[^a-zA-Z0-9_]', '', 'g'))
WHERE username_handle IS NULL;

-- jamin unik (jika ada duplikat, suffix dengan id)
WITH d AS (
  SELECT id, username_handle,
    row_number() OVER (PARTITION BY username_handle ORDER BY created_at) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET username_handle = p.username_handle || substr(p.id::text, 1, 4)
FROM d
WHERE p.id = d.id AND d.rn > 1;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_handle_unique UNIQUE (username_handle);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ USER SUBSCRIPTIONS ============
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  billing_cycle text CHECK (billing_cycle IN ('monthly','yearly')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  auto_renew boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users insert own subscription" ON public.user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = _user_id AND plan = 'pro'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- ============ PAYMENTS (Midtrans) ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  midtrans_transaction_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'IDR',
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settlement','capture','deny','cancel','expire','failure','refund')),
  payment_type text,
  raw_notification jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admin update payments" ON public.payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));

-- ============ PARENT LINKS (oleh anak yang Pro) ============
CREATE TABLE public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_username text NOT NULL,
  parent_email text NOT NULL,
  parent_label text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_parent_links_child ON public.parent_links(child_id);
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Child manage own parent links" ON public.parent_links
  FOR ALL USING (auth.uid() = child_id) WITH CHECK (auth.uid() = child_id);
CREATE POLICY "Super admin view all parent links" ON public.parent_links
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- enforce maks 2 ortu per anak
CREATE OR REPLACE FUNCTION public.enforce_max_two_parents()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.parent_links WHERE child_id = NEW.child_id AND is_active = true) >= 2 THEN
    RAISE EXCEPTION 'Maksimal 2 orang tua yang dapat dihubungkan';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_max_two_parents
  BEFORE INSERT ON public.parent_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_two_parents();

-- ============ MONTHLY REPORTS ============
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL,
  file_path text,
  file_url text,
  expires_at timestamptz,
  sent_to jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending','generated','sent','failed','expired','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reports" ON public.monthly_reports
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- ============ HANDLE NEW USER: profile + role + subscription ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_handle text;
  v_base text;
  v_n int := 0;
BEGIN
  v_base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  IF v_base = '' OR v_base IS NULL THEN v_base := 'user'; END IF;
  v_handle := v_base;
  WHILE EXISTS(SELECT 1 FROM public.profiles WHERE username_handle = v_handle) LOOP
    v_n := v_n + 1;
    v_handle := v_base || v_n::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, username_handle, email)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'username', v_base), v_handle, new.email);

  -- default role: user
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user') ON CONFLICT DO NOTHING;

  -- super admin auto untuk email tertentu
  IF lower(new.email) IN ('irsanwu@gmail.com', 'irsanwuu@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'super_admin') ON CONFLICT DO NOTHING;
  END IF;

  -- subscription default: free
  INSERT INTO public.user_subscriptions (user_id, plan, started_at)
  VALUES (new.id, 'free', now()) ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ BACKFILL existing users ============
-- pastikan setiap profile punya entry user_roles + user_subscriptions
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user' FROM public.profiles
ON CONFLICT DO NOTHING;

INSERT INTO public.user_subscriptions (user_id, plan, started_at)
SELECT id, 'free', created_at FROM public.profiles
ON CONFLICT DO NOTHING;

-- super admin untuk email yang sudah ada
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'
FROM auth.users u
WHERE lower(u.email) IN ('irsanwu@gmail.com', 'irsanwuu@gmail.com')
ON CONFLICT DO NOTHING;

-- updated_at trigger untuk subscriptions
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_user_subs_touch
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();