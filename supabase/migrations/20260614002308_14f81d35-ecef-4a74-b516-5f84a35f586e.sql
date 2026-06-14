ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS plan_slug text,
  ADD COLUMN IF NOT EXISTS coupon_code text;