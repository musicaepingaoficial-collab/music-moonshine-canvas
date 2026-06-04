ALTER TABLE public.admin_push_logs
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;