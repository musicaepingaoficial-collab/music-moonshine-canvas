DROP POLICY IF EXISTS "Anyone can read planos" ON public.planos;

CREATE POLICY "Anyone can read planos"
ON public.planos
FOR SELECT
TO anon, authenticated
USING (true);
