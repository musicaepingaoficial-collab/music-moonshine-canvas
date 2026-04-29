ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, whatsapp, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data->>'whatsapp', ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf',''), '\D', '', 'g'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
