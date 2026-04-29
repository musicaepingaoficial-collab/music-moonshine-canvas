-- 1) Conceder admin para usuários já existentes entre os 3 e-mails
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN ('rmoraes42@gmail.com','robsonmoraesdesigner@gmail.com','musicaepingaofical@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Função que concede admin automaticamente para os 3 e-mails ao se cadastrarem
CREATE OR REPLACE FUNCTION public.assign_admin_for_allowlisted_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN (
    'rmoraes42@gmail.com',
    'robsonmoraesdesigner@gmail.com',
    'musicaepingaofical@gmail.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Trigger no auth.users para aplicar a regra em novos cadastros
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_admin_for_allowlisted_email();