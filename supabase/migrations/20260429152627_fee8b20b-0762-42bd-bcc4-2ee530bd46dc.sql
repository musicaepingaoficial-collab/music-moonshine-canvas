ALTER TABLE public.pixel_settings
  ADD COLUMN IF NOT EXISTS kwai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kwai_pixel_id text,
  ADD COLUMN IF NOT EXISTS kwai_access_token text,
  ADD COLUMN IF NOT EXISTS tiktok_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id text,
  ADD COLUMN IF NOT EXISTS tiktok_access_token text;