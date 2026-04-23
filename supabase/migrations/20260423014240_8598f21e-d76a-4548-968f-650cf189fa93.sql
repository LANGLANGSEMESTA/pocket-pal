-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  service_name text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'IDR',
  billing_cycle text NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly'
  next_billing_date date NOT NULL,
  is_shared boolean DEFAULT false,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Subscription members (for patungan / shared)
CREATE TABLE public.subscription_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  member_phone text,
  share_amount numeric NOT NULL,
  is_paid boolean DEFAULT false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscription_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sub members" ON public.subscription_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_members.subscription_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own sub members" ON public.subscription_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_members.subscription_id AND s.user_id = auth.uid()));
CREATE POLICY "Users update own sub members" ON public.subscription_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_members.subscription_id AND s.user_id = auth.uid()));
CREATE POLICY "Users delete own sub members" ON public.subscription_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_members.subscription_id AND s.user_id = auth.uid()));

-- Add ui_vibe column to profiles for casual/professional toggle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ui_vibe text DEFAULT 'casual';