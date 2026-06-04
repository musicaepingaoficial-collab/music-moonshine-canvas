CREATE TABLE IF NOT EXISTS public.online_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  path TEXT,
  user_agent TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_users TO authenticated;
GRANT ALL ON public.online_users TO service_role;

ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own online status" 
  ON public.online_users FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all online users" 
  ON public.online_users FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to clean up inactive users (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_online_users() RETURNS void AS $$
BEGIN
  DELETE FROM public.online_users WHERE last_seen_at < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
