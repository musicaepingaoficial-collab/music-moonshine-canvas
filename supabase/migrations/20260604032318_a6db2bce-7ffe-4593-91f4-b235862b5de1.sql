CREATE TABLE public.sales_page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sales_page_views ENABLE ROW LEVEL SECURITY;

-- Permissões
GRANT INSERT ON public.sales_page_views TO anon;
GRANT INSERT ON public.sales_page_views TO authenticated;
GRANT SELECT ON public.sales_page_views TO service_role;

-- Políticas
CREATE POLICY "Permitir inserção anônima" ON public.sales_page_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Permitir inserção autenticada" ON public.sales_page_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Apenas admin pode ver" ON public.sales_page_views FOR SELECT TO service_role USING (true);
