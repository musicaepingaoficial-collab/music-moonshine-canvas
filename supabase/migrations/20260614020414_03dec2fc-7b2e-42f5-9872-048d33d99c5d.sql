
-- Tabela de controle dos envios
CREATE TABLE public.recovery_campaign_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  step smallint NOT NULL CHECK (step IN (1,2,3)),
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step)
);

GRANT SELECT ON public.recovery_campaign_log TO authenticated;
GRANT ALL ON public.recovery_campaign_log TO service_role;

ALTER TABLE public.recovery_campaign_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver logs de recuperação"
ON public.recovery_campaign_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_recovery_campaign_log_user_step ON public.recovery_campaign_log(user_id, step);
CREATE INDEX idx_recovery_campaign_log_sent_at ON public.recovery_campaign_log(sent_at);

-- Extensões para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar execução diária (10h BRT = 13h UTC)
SELECT cron.schedule(
  'recovery-emails-daily',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url:='https://zsquzchwxnsuysfrlngt.supabase.co/functions/v1/send-recovery-emails',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXV6Y2h3eG5zdXlzZnJsbmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDI1NzYsImV4cCI6MjA5MDc3ODU3Nn0.zyiJBVhSpB9UpKZCwsQiy28Dt00VtHCQHSo5fB8rT1o"}'::jsonb,
    body:='{"triggered_by":"cron"}'::jsonb
  );
  $$
);
