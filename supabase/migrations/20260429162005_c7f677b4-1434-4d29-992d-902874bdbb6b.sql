-- Add ordering and subtitle to anuncios
ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtitle TEXT;

CREATE INDEX IF NOT EXISTS idx_anuncios_active_position
  ON public.anuncios (active, position);

-- Storage bucket for banner images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('anuncios-images', 'anuncios-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of banner images
DROP POLICY IF EXISTS "Anuncios images are public" ON storage.objects;
CREATE POLICY "Anuncios images are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'anuncios-images');

-- Admins manage banner images
DROP POLICY IF EXISTS "Admins upload anuncios images" ON storage.objects;
CREATE POLICY "Admins upload anuncios images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anuncios-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update anuncios images" ON storage.objects;
CREATE POLICY "Admins update anuncios images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'anuncios-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete anuncios images" ON storage.objects;
CREATE POLICY "Admins delete anuncios images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'anuncios-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));