INSERT INTO public.planos (name, slug, price, active, description)
VALUES ('Módulo Discografias', 'discografias', 0, true, 'Acesso vitalício ao módulo de discografias')
ON CONFLICT (slug) DO NOTHING;