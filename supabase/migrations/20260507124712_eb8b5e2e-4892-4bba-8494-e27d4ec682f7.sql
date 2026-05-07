CREATE POLICY "Anyone can view admin repertorios"
ON public.repertorios
FOR SELECT
TO authenticated
USING (public.has_role(user_id, 'admin'::app_role));

CREATE POLICY "Anyone can view musicas of admin repertorios"
ON public.repertorio_musicas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repertorios r
    WHERE r.id = repertorio_musicas.repertorio_id
      AND public.has_role(r.user_id, 'admin'::app_role)
  )
);