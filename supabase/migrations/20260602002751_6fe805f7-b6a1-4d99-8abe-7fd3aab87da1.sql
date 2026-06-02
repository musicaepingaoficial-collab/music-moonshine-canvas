-- Add test_event_code to pixel_settings for Meta "Test Events" debugging
ALTER TABLE public.pixel_settings
  ADD COLUMN IF NOT EXISTS meta_test_event_code TEXT;

-- Audit log for Meta CAPI requests
CREATE TABLE IF NOT EXISTS public.meta_capi_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_id TEXT,
  status_code INTEGER,
  fbtrace_id TEXT,
  events_received INTEGER,
  response JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meta_capi_logs TO authenticated;
GRANT ALL ON public.meta_capi_logs TO service_role;

ALTER TABLE public.meta_capi_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read meta capi logs"
ON public.meta_capi_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_meta_capi_logs_created_at
  ON public.meta_capi_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_capi_logs_event_name
  ON public.meta_capi_logs (event_name);