ALTER TABLE public.discografias ADD COLUMN IF NOT EXISTS genero TEXT;
CREATE INDEX IF NOT EXISTS idx_discografias_genero ON public.discografias(genero);