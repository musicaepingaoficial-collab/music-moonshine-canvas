ALTER TABLE public.pixel_settings ADD COLUMN IF NOT EXISTS utmify_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.pixel_settings_secrets ADD COLUMN IF NOT EXISTS utmify_token TEXT;

-- Re-grant permissions to ensure frontend and edge functions can access new columns
GRANT SELECT, INSERT, UPDATE ON public.pixel_settings TO authenticated;
GRANT ALL ON public.pixel_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pixel_settings_secrets TO authenticated;
GRANT ALL ON public.pixel_settings_secrets TO service_role;