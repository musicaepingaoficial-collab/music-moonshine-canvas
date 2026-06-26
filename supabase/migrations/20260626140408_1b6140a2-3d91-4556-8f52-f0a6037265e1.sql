
-- TEMPLATES
CREATE TABLE public.whatsapp_recovery_templates (
  id text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.whatsapp_recovery_templates TO authenticated;
GRANT ALL ON public.whatsapp_recovery_templates TO service_role;

ALTER TABLE public.whatsapp_recovery_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read templates"
  ON public.whatsapp_recovery_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage templates"
  ON public.whatsapp_recovery_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- LOG
CREATE TABLE public.whatsapp_recovery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_by uuid,
  template_id text,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_recovery_log_user ON public.whatsapp_recovery_log(user_id, sent_at DESC);

GRANT SELECT, INSERT ON public.whatsapp_recovery_log TO authenticated;
GRANT ALL ON public.whatsapp_recovery_log TO service_role;

ALTER TABLE public.whatsapp_recovery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read recovery log"
  ON public.whatsapp_recovery_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert recovery log"
  ON public.whatsapp_recovery_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND sent_by = auth.uid());

-- SEED 5 modelos
INSERT INTO public.whatsapp_recovery_templates (id, title, body, order_index) VALUES
('modelo_1', 'Lembrete amigável',
'Oi {primeiro_nome}, tudo bem? 👋

Aqui é da Música e Pinga. Vi que você criou sua conta mas ainda não escolheu um plano pra liberar os downloads.

Posso te ajudar com alguma dúvida? 🎵', 1),

('modelo_2', 'Oferta com cupom',
'Fala {primeiro_nome}! 🎉

Liberei um cupom especial pra você assinar a Música e Pinga com desconto. É só acessar: {link_planos}

Qualquer dúvida me chama aqui!', 2),

('modelo_3', 'Prova social',
'E aí {primeiro_nome}! 🔥

Mais de 5 mil DJs já usam a Música e Pinga pra montar repertório em segundos. Garante seu acesso: {link_planos}

Bora?', 3),

('modelo_4', 'Última chance / urgência',
'{primeiro_nome}, passando rapidinho ⏰

A oferta que você viu na Música e Pinga tá encerrando. Se quiser garantir antes que suba o preço: {link_planos}

Me avisa se precisar de ajuda!', 4),

('modelo_5', 'Suporte humano',
'Oi {primeiro_nome}, aqui é da equipe Música e Pinga 😊

Vi seu cadastro e quis te chamar pessoalmente. Posso te ajudar a escolher o plano ideal pro seu trabalho como DJ?

Me conta o que você toca!', 5);
