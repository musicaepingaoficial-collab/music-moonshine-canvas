
CREATE POLICY "Deny client writes insert" ON public.rate_limits
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client writes update" ON public.rate_limits
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny client writes delete" ON public.rate_limits
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);
