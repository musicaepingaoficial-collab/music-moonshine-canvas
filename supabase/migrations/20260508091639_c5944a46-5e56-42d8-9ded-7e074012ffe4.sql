CREATE TABLE public.pending_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  cpf text NOT NULL,
  whatsapp text NOT NULL,
  plan text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  mp_payment_id bigint,
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  claim_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  claimed_at timestamptz,
  claimed_user_id uuid
);

CREATE INDEX idx_pending_subs_email ON public.pending_subscriptions (lower(email));
CREATE INDEX idx_pending_subs_mp_payment_id ON public.pending_subscriptions (mp_payment_id);
CREATE INDEX idx_pending_subs_token ON public.pending_subscriptions (claim_token);

ALTER TABLE public.pending_subscriptions ENABLE ROW LEVEL SECURITY;

-- Sem políticas para anon/authenticated. Edge functions usam service role e ignoram RLS.
