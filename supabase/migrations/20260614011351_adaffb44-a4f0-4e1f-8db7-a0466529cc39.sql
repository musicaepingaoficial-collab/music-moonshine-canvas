
CREATE OR REPLACE FUNCTION public.enforce_single_active_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF NEW.plan = 'vitalicio' THEN
      UPDATE public.assinaturas
      SET status = 'superseded'
      WHERE user_id = NEW.user_id
        AND status = 'active'
        AND id <> NEW.id
        AND plan <> 'vitalicio';
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.assinaturas
        WHERE user_id = NEW.user_id
          AND status = 'active'
          AND plan = 'vitalicio'
          AND id <> NEW.id
      ) THEN
        NEW.status := 'superseded';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_active_subscription_trg ON public.assinaturas;
CREATE TRIGGER enforce_single_active_subscription_trg
BEFORE INSERT OR UPDATE OF status, plan ON public.assinaturas
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_active_subscription();
