CREATE TABLE public.admin_push_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  title text,
  total_subs integer,
  sent integer,
  removed integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_push_logs TO authenticated;
GRANT ALL ON public.admin_push_logs TO service_role;

ALTER TABLE public.admin_push_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read push logs"
  ON public.admin_push_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX admin_push_logs_created_at_idx ON public.admin_push_logs (created_at DESC);