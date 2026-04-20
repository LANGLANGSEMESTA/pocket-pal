ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scan_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scan_count_month text;
ALTER TABLE public.parent_child ADD COLUMN IF NOT EXISTS expires_at timestamptz;