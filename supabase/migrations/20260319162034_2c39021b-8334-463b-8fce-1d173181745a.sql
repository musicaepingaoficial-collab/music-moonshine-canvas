
-- Add whatsapp column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;

-- Update handle_new_user trigger to include whatsapp from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'whatsapp'
  );
  RETURN NEW;
END;
$function$;
