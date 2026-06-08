ALTER TABLE public.sales_page_views ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.sales_page_views TO anon;
GRANT SELECT, INSERT ON public.sales_page_views TO authenticated;
GRANT ALL ON public.sales_page_views TO service_role;

DROP POLICY IF EXISTS "Permitir inserção anonima em page views" ON public.sales_page_views;
DROP POLICY IF EXISTS "Permitir leitura anonima em page views" ON public.sales_page_views;
DROP POLICY IF EXISTS "Permitir inserção anônima" ON public.sales_page_views;
DROP POLICY IF EXISTS "Permitir inserção anônima em page views" ON public.sales_page_views;
DROP POLICY IF EXISTS "Permitir leitura anônima em page views" ON public.sales_page_views;

CREATE POLICY "Permitir inserção anonima em page views"
ON public.sales_page_views
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Permitir leitura anonima em page views"
ON public.sales_page_views
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Permitir inserção autenticada em page views" ON public.sales_page_views;
CREATE POLICY "Permitir inserção autenticada em page views"
ON public.sales_page_views
FOR INSERT
TO authenticated
WITH CHECK (true);