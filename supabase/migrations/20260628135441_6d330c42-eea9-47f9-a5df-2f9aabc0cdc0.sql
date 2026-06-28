
-- 1) Config table (single row)
CREATE TABLE public.kiwify_bridge_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  destination_url text,
  product_id text,
  product_name text,
  secret_token text,
  forward_pending boolean NOT NULL DEFAULT false,
  forward_refused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiwify_bridge_config TO authenticated;
GRANT ALL ON public.kiwify_bridge_config TO service_role;

ALTER TABLE public.kiwify_bridge_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage kiwify bridge config"
ON public.kiwify_bridge_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER kiwify_bridge_config_updated_at
BEFORE UPDATE ON public.kiwify_bridge_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed single config row
INSERT INTO public.kiwify_bridge_config (enabled) VALUES (false);

-- 2) Logs table
CREATE TABLE public.kiwify_bridge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_payment_id text,
  mp_status text,
  kiwify_status text,
  destination_url text,
  request_payload jsonb,
  response_status integer,
  response_body text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kiwify_bridge_logs TO authenticated;
GRANT ALL ON public.kiwify_bridge_logs TO service_role;

ALTER TABLE public.kiwify_bridge_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read kiwify bridge logs"
ON public.kiwify_bridge_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX kiwify_bridge_logs_created_at_idx
ON public.kiwify_bridge_logs (created_at DESC);
