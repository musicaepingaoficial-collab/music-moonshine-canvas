CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.password_reset_tokens TO service_role;

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON public.password_reset_tokens (email);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx ON public.password_reset_tokens (expires_at);