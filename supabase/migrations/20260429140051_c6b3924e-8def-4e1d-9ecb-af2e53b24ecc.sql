-- 1) Conceder assinatura vitalícia ativa aos usuários já existentes entre os 3 e-mails
INSERT INTO public.assinaturas (user_id, plan, status, price, starts_at, expires_at)
SELECT u.id, 'vitalicio', 'active', 0, now(), NULL
FROM auth.users u
WHERE u.email IN ('rmoraes42@gmail.com','robsonmoraesdesigner@gmail.com','musicaepingaofical@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.assinaturas a
    WHERE a.user_id = u.id AND a.plan = 'vitalicio' AND a.status = 'active'
  );

-- 2) Atualizar a função para também criar assinatura vitalícia
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
    -- Conceder papel de admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Conceder assinatura vitalícia ativa
    INSERT INTO public.assinaturas (user_id, plan, status, price, starts_at, expires_at)
    SELECT NEW.id, 'vitalicio', 'active', 0, now(), NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.assinaturas a
      WHERE a.user_id = NEW.id AND a.plan = 'vitalicio' AND a.status = 'active'
    );
  END IF;
  RETURN NEW;
END;
$$;