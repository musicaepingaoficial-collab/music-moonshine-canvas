CREATE OR REPLACE FUNCTION public.admin_afiliados_stats()
 RETURNS TABLE(afiliado_id uuid, user_id uuid, name text, email text, code text, commission_percent numeric, created_at timestamp with time zone, clicks bigint, signups bigint, conversions bigint, revenue numeric, commission_due numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT ac.afiliado_id AS aid, COUNT(*)::bigint AS clicks
    FROM public.afiliado_clicks ac
    GROUP BY ac.afiliado_id
  ) c ON c.aid = a.id
  LEFT JOIN (
    SELECT
      ind.afiliado_id AS aid,
      COUNT(*)::bigint AS signups,
      COUNT(*) FILTER (WHERE ind.converted_at IS NOT NULL)::bigint AS conversions
    FROM public.indicacoes ind
    GROUP BY ind.afiliado_id
  ) i ON i.aid = a.id
  LEFT JOIN (
    SELECT
      ind.afiliado_id AS aid,
      SUM(ass.price) AS revenue
    FROM public.indicacoes ind
    JOIN public.assinaturas ass ON ass.id = ind.assinatura_id
    WHERE ind.converted_at IS NOT NULL
    GROUP BY ind.afiliado_id
  ) r ON r.aid = a.id
  ORDER BY COALESCE(r.revenue, 0) DESC, COALESCE(c.clicks, 0) DESC;
END;
$function$;