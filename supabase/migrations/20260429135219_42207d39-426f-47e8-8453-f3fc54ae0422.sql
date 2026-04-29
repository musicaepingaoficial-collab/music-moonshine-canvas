INSERT INTO public.planos (slug, name, price, duration_days, active, description) VALUES
  ('mensal',     'Mensal',     19.90, 30,   true, 'Acesso completo por 30 dias'),
  ('semestral',  'Semestral',  49.90, 180,  true, 'Acesso completo por 6 meses'),
  ('anual',      'Anual',      87.00, 365,  true, 'Acesso completo por 1 ano'),
  ('vitalicio',  'Vitalício',  147.00, NULL, true, 'Acesso vitalício, pagamento único')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  active = EXCLUDED.active,
  description = EXCLUDED.description;