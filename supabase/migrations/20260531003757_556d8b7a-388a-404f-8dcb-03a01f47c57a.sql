-- Adiciona restrição de unicidade para evitar duplicatas de artistas no mesmo gênero
ALTER TABLE public.discografias 
ADD CONSTRAINT unique_artista_genero UNIQUE (artista_nome, genero);
