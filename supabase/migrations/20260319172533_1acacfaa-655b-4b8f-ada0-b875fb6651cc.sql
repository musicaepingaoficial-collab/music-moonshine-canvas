
-- Criar tabela notificacoes
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'promocao',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário vê suas notificações + globais (user_id IS NULL)
CREATE POLICY "Users can view own and global notifications"
ON public.notificacoes FOR SELECT TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- UPDATE: usuário pode marcar como lida (suas ou globais)
CREATE POLICY "Users can mark notifications as read"
ON public.notificacoes FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Admin pode tudo
CREATE POLICY "Admins can manage notifications"
ON public.notificacoes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
