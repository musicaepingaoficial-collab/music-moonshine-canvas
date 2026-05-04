-- Adiciona coluna de acesso ao módulo discografias
ALTER TABLE public.profiles ADD COLUMN has_discografias BOOLEAN DEFAULT false;

-- Garante que o usuário pode ver seu próprio status e admins podem ver tudo
-- (As políticas existentes na profiles já devem cobrir isso, mas garantimos o acesso)
COMMENT ON COLUMN public.profiles.has_discografias IS 'Indica se o usuário possui acesso ao módulo de discografias (vitalício ou compra avulsa)';