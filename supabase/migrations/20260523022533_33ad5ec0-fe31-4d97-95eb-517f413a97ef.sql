
-- consent_logs
CREATE TABLE public.consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('cookies_essential','cookies_analytics','cookies_marketing','terms','privacy','marketing_comms')),
  granted boolean NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  ip text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_logs_user ON public.consent_logs(user_id, created_at DESC);
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consents"
  ON public.consent_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert consent"
  ON public.consent_logs FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins manage consents"
  ON public.consent_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- admin_access_logs
CREATE TABLE public.admin_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid NULL,
  action text NOT NULL,
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_access_logs_target ON public.admin_access_logs(target_user_id, created_at DESC);
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read access logs"
  ON public.admin_access_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert access logs"
  ON public.admin_access_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- anonimização
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anonymized_at timestamptz NULL;
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS anonymized_at timestamptz NULL;
