
CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price numeric NOT NULL,
  duration_days integer,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.planos
  FOR SELECT TO authenticated USING (active = true);

CREATE POLICY "Admins can manage plans" ON public.planos
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.planos (name, slug, price, duration_days, description) VALUES
  ('Mensal', 'mensal', 9.90, 30, 'Acesso mensal completo'),
  ('Semestral', 'semestral', 49.90, 180, 'Acesso por 6 meses'),
  ('Vitalício', 'vitalicio', 97.90, NULL, 'Acesso vitalício');
