CREATE TABLE public.discografias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artista_nome TEXT NOT NULL,
  imagem_url TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.discografias ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Discografias visíveis para todos" 
ON public.discografias FOR SELECT 
USING (true);

-- Apenas administradores podem gerenciar
CREATE POLICY "Admins podem inserir discografias" 
ON public.discografias FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins podem atualizar discografias" 
ON public.discografias FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins podem deletar discografias" 
ON public.discografias FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_discografias_updated_at
BEFORE UPDATE ON public.discografias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();