ALTER TABLE public.welcome_popup 
ADD COLUMN IF NOT EXISTS plan_slug TEXT,
ADD COLUMN IF NOT EXISTS discount_percent INTEGER,
ADD COLUMN IF NOT EXISTS cta_label TEXT;

-- Garantir que os admins possam ler e atualizar
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welcome_popup TO authenticated;
GRANT ALL ON public.welcome_popup TO service_role;
