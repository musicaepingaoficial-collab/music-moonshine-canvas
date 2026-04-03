-- Add user_id to repertorios
ALTER TABLE public.repertorios ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing RLS policies on repertorios
DROP POLICY IF EXISTS "Admins can manage repertorios" ON public.repertorios;
DROP POLICY IF EXISTS "Authenticated users can view repertorios" ON public.repertorios;

-- New RLS for repertorios
CREATE POLICY "Users can view own repertorios" ON public.repertorios
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own repertorios" ON public.repertorios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own repertorios" ON public.repertorios
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own repertorios" ON public.repertorios
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Drop existing RLS policies on repertorio_musicas
DROP POLICY IF EXISTS "Admins can manage repertorio_musicas" ON public.repertorio_musicas;
DROP POLICY IF EXISTS "Authenticated users can view repertorio_musicas" ON public.repertorio_musicas;

-- New RLS for repertorio_musicas
CREATE POLICY "Users can view own repertorio_musicas" ON public.repertorio_musicas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.repertorios WHERE id = repertorio_id AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Users can insert own repertorio_musicas" ON public.repertorio_musicas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.repertorios WHERE id = repertorio_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own repertorio_musicas" ON public.repertorio_musicas
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.repertorios WHERE id = repertorio_id AND user_id = auth.uid()));