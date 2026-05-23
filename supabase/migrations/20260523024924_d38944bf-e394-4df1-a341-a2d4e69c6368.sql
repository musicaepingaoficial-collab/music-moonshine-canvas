
-- ============================================================
-- FASE 1.1: Separar tokens secretos de pixel_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pixel_settings_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_access_token text,
  tiktok_access_token text,
  kwai_access_token text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.pixel_settings_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pixel secrets"
ON public.pixel_settings_secrets FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrar tokens existentes
INSERT INTO public.pixel_settings_secrets (meta_access_token, tiktok_access_token, kwai_access_token, updated_at)
SELECT meta_access_token, tiktok_access_token, kwai_access_token, now()
FROM public.pixel_settings
WHERE meta_access_token IS NOT NULL OR tiktok_access_token IS NOT NULL OR kwai_access_token IS NOT NULL
LIMIT 1;

-- Remover tokens da tabela pública
ALTER TABLE public.pixel_settings DROP COLUMN IF EXISTS meta_access_token;
ALTER TABLE public.pixel_settings DROP COLUMN IF EXISTS tiktok_access_token;
ALTER TABLE public.pixel_settings DROP COLUMN IF EXISTS kwai_access_token;

-- ============================================================
-- FASE 1.3: pending_subscriptions RLS + expiração
-- ============================================================
CREATE POLICY "Admins manage pending subscriptions"
ON public.pending_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.pending_subscriptions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');

CREATE INDEX IF NOT EXISTS idx_pending_subs_claim_token ON public.pending_subscriptions(claim_token);
CREATE INDEX IF NOT EXISTS idx_pending_subs_expires_at ON public.pending_subscriptions(expires_at);

-- Remover active_sessions do realtime publication (se estiver)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.active_sessions';
  END IF;
END $$;

-- ============================================================
-- FASE 1.4: tabela de rate-limit ad-hoc
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rate limits"
ON public.rate_limits FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- ============================================================
-- FASE 2.1: REVOKE EXECUTE em funções DEFINER internas
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_admin_for_allowlisted_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- FASE 2.2: admin_allowlist (em vez de hardcode)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage allowlist"
ON public.admin_allowlist FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.admin_allowlist (email) VALUES
  ('rmoraes42@gmail.com'),
  ('robsonmoraesdesigner@gmail.com'),
  ('musicaepingaofical@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_admin_for_allowlisted_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE email = NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.assinaturas (user_id, plan, status, price, starts_at, expires_at)
    SELECT NEW.id, 'vitalicio', 'active', 0, now(), NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.assinaturas a
      WHERE a.user_id = NEW.id AND a.plan = 'vitalicio' AND a.status = 'active'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- FASE 2.4: SELECT explícitos em suppliers e google_drives
-- ============================================================
CREATE POLICY "Admins read suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read google_drives"
ON public.google_drives FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FASE 3.7: Forçar e-mail lowercase em profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email = lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.normalize_profile_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_normalize_profile_email ON public.profiles;
CREATE TRIGGER trg_normalize_profile_email
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_email();
