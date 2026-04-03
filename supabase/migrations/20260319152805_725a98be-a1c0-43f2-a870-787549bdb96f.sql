-- Create storage bucket for repertorio covers
INSERT INTO storage.buckets (id, name, public) VALUES ('repertorio-covers', 'repertorio-covers', true);

-- Allow authenticated users to upload covers
CREATE POLICY "Users can upload covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'repertorio-covers');

-- Allow anyone to view covers (public bucket)
CREATE POLICY "Anyone can view covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'repertorio-covers');

-- Allow users to update their own covers
CREATE POLICY "Users can update own covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'repertorio-covers');

-- Allow users to delete their own covers
CREATE POLICY "Users can delete own covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'repertorio-covers');

-- Add file_size column to musicas for calculating repertorio total size
ALTER TABLE public.musicas ADD COLUMN IF NOT EXISTS file_size bigint DEFAULT NULL;