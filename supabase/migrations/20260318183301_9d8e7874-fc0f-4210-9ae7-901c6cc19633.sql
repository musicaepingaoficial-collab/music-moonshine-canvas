
-- Repertórios table
CREATE TABLE public.repertorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.repertorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage repertorios" ON public.repertorios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view repertorios" ON public.repertorios
  FOR SELECT TO authenticated
  USING (true);

-- Junction table linking repertórios to existing músicas
CREATE TABLE public.repertorio_musicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repertorio_id uuid NOT NULL REFERENCES public.repertorios(id) ON DELETE CASCADE,
  musica_id uuid NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (repertorio_id, musica_id)
);

ALTER TABLE public.repertorio_musicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage repertorio_musicas" ON public.repertorio_musicas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view repertorio_musicas" ON public.repertorio_musicas
  FOR SELECT TO authenticated
  USING (true);
