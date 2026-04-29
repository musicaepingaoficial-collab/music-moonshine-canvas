
-- Enum para tipo de acesso
CREATE TYPE public.pdf_access_type AS ENUM ('paid', 'subscriber_bonus');

-- Tabela de PDFs
CREATE TABLE public.pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  cover_url TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  access_type public.pdf_access_type NOT NULL DEFAULT 'subscriber_bonus',
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active pdfs"
ON public.pdfs FOR SELECT TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage pdfs"
ON public.pdfs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pdfs_updated_at
BEFORE UPDATE ON public.pdfs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tabela de compras avulsas
CREATE TABLE public.pdf_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pdf_purchases_user_pdf_approved_idx
ON public.pdf_purchases (user_id, pdf_id)
WHERE status = 'approved';

CREATE INDEX pdf_purchases_payment_id_idx ON public.pdf_purchases(payment_id);

ALTER TABLE public.pdf_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pdf purchases"
ON public.pdf_purchases FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins manage pdf purchases"
ON public.pdf_purchases FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pdf_purchases_updated_at
BEFORE UPDATE ON public.pdf_purchases
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Função para checar acesso ao PDF
CREATE OR REPLACE FUNCTION public.has_pdf_access(_user_id UUID, _pdf_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pdfs p
      WHERE p.id = _pdf_id
        AND p.access_type = 'subscriber_bonus'
        AND EXISTS (
          SELECT 1 FROM public.assinaturas a
          WHERE a.user_id = _user_id
            AND a.status = 'active'
            AND (a.expires_at IS NULL OR a.expires_at > now())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.pdf_purchases pp
      WHERE pp.user_id = _user_id
        AND pp.pdf_id = _pdf_id
        AND pp.status = 'approved'
    );
$$;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-covers', 'pdf-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies bucket pdf-covers (público)
CREATE POLICY "Anyone can read pdf covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdf-covers');

CREATE POLICY "Admins manage pdf covers"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'pdf-covers' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'pdf-covers' AND public.has_role(auth.uid(), 'admin'));

-- Policies bucket pdfs (privado, só admins gerenciam; download via edge function com service role)
CREATE POLICY "Admins manage pdf files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
