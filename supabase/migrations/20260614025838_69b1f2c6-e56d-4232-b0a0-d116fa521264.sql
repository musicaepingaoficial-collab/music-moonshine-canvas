
-- 1. Tabela de cliques
CREATE TABLE public.afiliado_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id uuid NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_afiliado_clicks_afiliado_id ON public.afiliado_clicks(afiliado_id);
CREATE INDEX idx_afiliado_clicks_created_at ON public.afiliado_clicks(created_at DESC);

GRANT INSERT ON public.afiliado_clicks TO anon, authenticated;
GRANT SELECT ON public.afiliado_clicks TO authenticated;
GRANT ALL ON public.afiliado_clicks TO service_role;

ALTER TABLE public.afiliado_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks"
  ON public.afiliado_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all clicks"
  ON public.afiliado_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Conversões em indicacoes
ALTER TABLE public.indicacoes
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS assinatura_id uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_indicacoes_referred_user_id ON public.indicacoes(referred_user_id);

-- 3. RPC de estatísticas (admin only)
CREATE OR REPLACE FUNCTION public.admin_afiliados_stats()
RETURNS TABLE (
  afiliado_id uuid,
  user_id uuid,
  name text,
  email text,
  code text,
  commission_percent numeric,
  created_at timestamptz,
  clicks bigint,
  signups bigint,
  conversions bigint,
  revenue numeric,
  commission_due numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    a.id AS afiliado_id,
    a.user_id,
    p.name,
    p.email,
    a.code,
    a.commission_percent,
    a.created_at,
    COALESCE(c.clicks, 0) AS clicks,
    COALESCE(i.signups, 0) AS signups,
    COALESCE(i.conversions, 0) AS conversions,
    COALESCE(r.revenue, 0)::numeric AS revenue,
    ROUND(COALESCE(r.revenue, 0)::numeric * COALESCE(a.commission_percent, 0) / 100, 2) AS commission_due
  FROM public.afiliados a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN (
    SELECT afiliado_id, COUNT(*)::bigint AS clicks
    FROM public.afiliado_clicks
    GROUP BY afiliado_id
  ) c ON c.afiliado_id = a.id
  LEFT JOIN (
    SELECT
      afiliado_id,
      COUNT(*)::bigint AS signups,
      COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::bigint AS conversions
    FROM public.indicacoes
    GROUP BY afiliado_id
  ) i ON i.afiliado_id = a.id
  LEFT JOIN (
    SELECT
      ind.afiliado_id,
      SUM(ass.price) AS revenue
    FROM public.indicacoes ind
    JOIN public.assinaturas ass ON ass.id = ind.assinatura_id
    WHERE ind.converted_at IS NOT NULL
    GROUP BY ind.afiliado_id
  ) r ON r.afiliado_id = a.id
  ORDER BY COALESCE(r.revenue, 0) DESC, COALESCE(c.clicks, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_afiliados_stats() TO authenticated;

-- 4. RPC detalhes por afiliado
CREATE OR REPLACE FUNCTION public.admin_afiliado_detail(_afiliado_id uuid)
RETURNS TABLE (
  indicacao_id uuid,
  referred_user_id uuid,
  referred_name text,
  referred_email text,
  status text,
  created_at timestamptz,
  converted_at timestamptz,
  plan text,
  price numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    i.id AS indicacao_id,
    i.referred_user_id,
    p.name AS referred_name,
    p.email AS referred_email,
    i.status,
    i.created_at,
    i.converted_at,
    a.plan,
    a.price
  FROM public.indicacoes i
  LEFT JOIN public.profiles p ON p.id = i.referred_user_id
  LEFT JOIN public.assinaturas a ON a.id = i.assinatura_id
  WHERE i.afiliado_id = _afiliado_id
  ORDER BY i.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_afiliado_detail(uuid) TO authenticated;
