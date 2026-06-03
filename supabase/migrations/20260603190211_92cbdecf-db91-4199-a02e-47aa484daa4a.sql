ALTER TABLE public.welcome_popup 
ADD COLUMN IF NOT EXISTS exclude_plan_slugs TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS include_plan_slugs TEXT[] DEFAULT '{}';
