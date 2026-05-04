-- Create bucket for discografias if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('discografias', 'discografias', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public access to view images
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'discografias');

-- Policies for admins to manage images
CREATE POLICY "Admin Insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'discografias' AND 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin Update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'discografias' AND 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin Delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'discografias' AND 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );