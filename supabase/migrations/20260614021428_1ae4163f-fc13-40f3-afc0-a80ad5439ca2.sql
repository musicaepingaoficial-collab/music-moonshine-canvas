
-- 1. Config singleton
CREATE TABLE public.recovery_campaign_config (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  enabled boolean NOT NULL DEFAULT true,
  step1_subject text NOT NULL,
  step1_html text NOT NULL,
  step2_subject text NOT NULL,
  step2_html text NOT NULL,
  step2_cupom text NOT NULL DEFAULT 'VOLTA20',
  step3_subject text NOT NULL,
  step3_html text NOT NULL,
  step3_cupom text NOT NULL DEFAULT 'ULTIMA40',
  step2_delay_days int NOT NULL DEFAULT 3,
  step3_delay_days int NOT NULL DEFAULT 4,
  batch_limit int NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.recovery_campaign_config TO authenticated;
GRANT ALL ON public.recovery_campaign_config TO service_role;

ALTER TABLE public.recovery_campaign_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read config" ON public.recovery_campaign_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins write config" ON public.recovery_campaign_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Eventos (abertura, conversão)
CREATE TABLE public.recovery_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES public.recovery_campaign_log(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('open','convert')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip text,
  metadata jsonb
);

GRANT SELECT ON public.recovery_email_events TO authenticated;
GRANT ALL ON public.recovery_email_events TO service_role;

ALTER TABLE public.recovery_email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read events" ON public.recovery_email_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_recovery_email_events_log ON public.recovery_email_events(log_id);
CREATE INDEX idx_recovery_email_events_type ON public.recovery_email_events(event_type, occurred_at);

-- 3. Colunas extras no log
ALTER TABLE public.recovery_campaign_log
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- 4. Seed da config padrão
INSERT INTO public.recovery_campaign_config (
  id, enabled,
  step1_subject, step1_html,
  step2_subject, step2_html, step2_cupom,
  step3_subject, step3_html, step3_cupom,
  step2_delay_days, step3_delay_days, batch_limit
) VALUES (
  'default', true,
  'Sentimos sua falta no Música e Pinga 🎵',
  '<h2>Olá {{FIRST_NAME}}!</h2><p>Notamos que você criou sua conta no <strong>Música e Pinga</strong> mas ainda não aproveitou tudo que preparamos pra você.</p><p>Com um plano ativo você libera:</p><ul><li>🎶 Acervo completo com milhares de faixas organizadas por estilo</li><li>⬇️ Downloads ilimitados</li><li>📂 Repertórios prontos e personalizáveis</li><li>🎼 PDFs, cifras e materiais exclusivos</li></ul><p><a class="button" href="{{PLANOS_URL}}">Ver planos</a></p><p>Te esperamos lá dentro! 🍻</p>',
  'Liberamos 20% OFF só pra você voltar 🎁',
  '<h2>Olá {{FIRST_NAME}}, separamos um presente pra você!</h2><p>Aplicamos um cupom de <strong>20% de desconto</strong> em qualquer plano para você experimentar tudo que o <strong>Música e Pinga</strong> tem a oferecer.</p><p style="text-align:center;font-size:22px;letter-spacing:2px;border:2px dashed #10b981;padding:14px;border-radius:8px;margin:24px 0;"><strong>{{CUPOM}}</strong></p><p>Use o cupom no checkout. Aproveite enquanto está disponível.</p><p><a class="button" href="{{PLANOS_URL}}">Quero meu desconto</a></p>',
  'VOLTA20',
  '⏰ Última chance: 40% OFF expira em 24h',
  '<h2>{{FIRST_NAME}}, essa é a última chamada!</h2><p>Como você ainda não assinou, liberamos nosso <strong>maior desconto</strong>: <strong>40% OFF</strong> em qualquer plano.</p><p style="text-align:center;font-size:22px;letter-spacing:2px;border:2px dashed #ef4444;padding:14px;border-radius:8px;margin:24px 0;"><strong>{{CUPOM}}</strong></p><p>Esse cupom <strong>expira em 24 horas</strong>. Garante o seu agora 👇</p><p><a class="button" href="{{PLANOS_URL}}">Assinar com 40% OFF</a></p>',
  'ULTIMA40',
  3, 4, 100
) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_recovery_config_updated
BEFORE UPDATE ON public.recovery_campaign_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
