-- Tabela de configurações gerais do site (singleton via id fixo)
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_title text NOT NULL DEFAULT 'Estamos em manutenção',
  maintenance_message text NOT NULL DEFAULT 'O site está temporariamente fora do ar. Voltaremos em breve.',
  whatsapp_number text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler (necessário para checar manutenção)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can manage site settings"
ON public.site_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insere registro singleton inicial
INSERT INTO public.site_settings (maintenance_mode) VALUES (false);

-- Tabela de configurações de pixels (singleton)
CREATE TABLE public.pixel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Meta Pixel + CAPI
  meta_enabled boolean NOT NULL DEFAULT false,
  meta_pixel_id text,
  meta_access_token text,
  meta_events jsonb NOT NULL DEFAULT '{"page_view":true,"view_content":true,"add_to_cart":true,"initiate_checkout":true,"add_payment_info":true,"purchase":true,"lead":true,"complete_registration":true}'::jsonb,

  -- Google Ads
  google_ads_enabled boolean NOT NULL DEFAULT false,
  google_ads_conversion_id text,
  google_ads_labels jsonb NOT NULL DEFAULT '{"page_view":"","begin_checkout":"","purchase":"","sign_up":""}'::jsonb,

  -- Google Tag Manager
  gtm_enabled boolean NOT NULL DEFAULT false,
  gtm_container_id text,

  -- Google Analytics 4
  ga4_enabled boolean NOT NULL DEFAULT false,
  ga4_measurement_id text,

  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.pixel_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública para que o frontend possa injetar pixels
CREATE POLICY "Anyone can read pixel settings"
ON public.pixel_settings FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can manage pixel settings"
ON public.pixel_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pixel_settings_updated_at
BEFORE UPDATE ON public.pixel_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.pixel_settings (meta_enabled) VALUES (false);