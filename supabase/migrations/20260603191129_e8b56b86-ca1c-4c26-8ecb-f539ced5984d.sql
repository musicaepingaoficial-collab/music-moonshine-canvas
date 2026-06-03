-- Como a tabela welcome_popup parece ter sido desenhada para apenas uma linha (maybeSingle), 
-- vamos garantir que ela suporte múltiplas agora se necessário.
-- Se já houver restrições de unicidade, elas devem ser tratadas, mas geralmente o maybeSingle() apenas pega a primeira.

ALTER TABLE public.welcome_popup ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.welcome_popup TO authenticated;
GRANT ALL ON public.welcome_popup TO service_role;
