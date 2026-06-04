DROP POLICY IF EXISTS "Users can update own notificacoes" ON public.notificacoes;
CREATE POLICY "Users can update own notificacoes"
ON public.notificacoes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.cleanup_online_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.online_users WHERE last_seen_at < now() - interval '5 minutes';
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_usage_metric()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_online INTEGER;
BEGIN
  DELETE FROM public.online_users WHERE last_seen_at < now() - interval '3 minutes';
  SELECT count(*)::int INTO current_online FROM public.online_users;
  INSERT INTO public.usage_metrics (online_count) VALUES (current_online);
END;
$function$;