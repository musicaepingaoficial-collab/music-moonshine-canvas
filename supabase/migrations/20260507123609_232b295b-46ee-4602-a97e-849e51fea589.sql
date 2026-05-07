CREATE TABLE public.welcome_popup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  show_to_new boolean NOT NULL DEFAULT true,
  show_to_subscribers boolean NOT NULL DEFAULT false,
  new_user_days integer NOT NULL DEFAULT 7,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.welcome_popup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read welcome popup"
  ON public.welcome_popup FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage welcome popup"
  ON public.welcome_popup FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER welcome_popup_set_updated_at
  BEFORE UPDATE ON public.welcome_popup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.welcome_popup (active, title, description) VALUES (false, 'Bem-vindo!', '');