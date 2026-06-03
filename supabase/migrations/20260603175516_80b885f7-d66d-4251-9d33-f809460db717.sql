-- Tabela de Cupons
CREATE TABLE public.cupons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    desconto_percentual DECIMAL NOT NULL CHECK (desconto_percentual > 0 AND desconto_percentual <= 100),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    uso_limite INTEGER,
    uso_atual INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Usos de Cupons (para evitar reuso se desejar ou para histórico)
CREATE TABLE public.cupom_usos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cupom_id UUID REFERENCES public.cupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant privileges
GRANT SELECT ON public.cupons TO authenticated;
GRANT ALL ON public.cupons TO service_role;

GRANT SELECT, INSERT ON public.cupom_usos TO authenticated;
GRANT ALL ON public.cupom_usos TO service_role;

-- RLS
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupom_usos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Qualquer autenticado pode ver cupons ativos" ON public.cupons
    FOR SELECT USING (ativo = true AND (data_expiracao IS NULL OR data_expiracao > now()));

CREATE POLICY "Admins tem controle total sobre cupons" ON public.cupons
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Usuários podem ver seus próprios usos de cupom" ON public.cupom_usos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os usos de cupom" ON public.cupom_usos
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Trigger para updated_at
CREATE TRIGGER update_cupons_updated_at BEFORE UPDATE ON public.cupons 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();