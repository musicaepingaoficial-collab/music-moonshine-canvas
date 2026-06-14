
ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS include_plan_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclude_plan_slugs text[] NOT NULL DEFAULT '{}';
