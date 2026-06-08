
-- sales_page_views: permitir INSERT anônimo e autenticado via GRANT + policy
GRANT INSERT ON public.sales_page_views TO anon;
GRANT INSERT ON public.sales_page_views TO authenticated;
GRANT ALL ON public.sales_page_views TO service_role;

-- Garantir policy de INSERT para anon (caso falte)
DROP POLICY IF EXISTS "Permitir inserção anônima" ON public.sales_page_views;
CREATE POLICY "Permitir inserção anônima"
  ON public.sales_page_views FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir inserção autenticada" ON public.sales_page_views;
CREATE POLICY "Permitir inserção autenticada"
  ON public.sales_page_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- pixel_settings: leitura pública para anon/authenticated
GRANT SELECT ON public.pixel_settings TO anon;
GRANT SELECT ON public.pixel_settings TO authenticated;
GRANT ALL ON public.pixel_settings TO service_role;
