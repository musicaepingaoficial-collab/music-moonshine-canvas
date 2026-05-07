-- 1. Fix search_path for common function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2. Fix critical broad policy on suppliers
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
CREATE POLICY "Admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Prevent users from self-assigning sensitive flags in profiles
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If has_discografias is changing and the user is NOT an admin, raise error
  IF (OLD.has_discografias IS DISTINCT FROM NEW.has_discografias) THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status de discografias.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_check_profile_update ON public.profiles;
CREATE TRIGGER tr_check_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_update();

-- 4. Allow users to see their own referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON public.indicacoes;
CREATE POLICY "Users can view own referrals" 
ON public.indicacoes 
FOR SELECT 
TO authenticated 
USING (
  afiliado_id IN (
    SELECT id FROM public.afiliados WHERE user_id = auth.uid()
  ) OR 
  referred_user_id = auth.uid()
);

-- 5. Tighten notifications update
DROP POLICY IF EXISTS "Users can update own notificacoes" ON public.notificacoes;
CREATE POLICY "Users can update own notificacoes" 
ON public.notificacoes 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid()); -- Prevent moving broad notifications to other users

-- 6. Tighten storage policies for repertorio-covers
DROP POLICY IF EXISTS "Authenticated can upload covers" ON storage.objects;
CREATE POLICY "Admins can upload covers" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'repertorio-covers' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can update own covers" ON storage.objects;
CREATE POLICY "Admins can update covers" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'repertorio-covers' AND has_role(auth.uid(), 'admin'::app_role));
