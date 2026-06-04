-- Table to store historical usage peaks
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  online_count INTEGER NOT NULL
);

GRANT SELECT ON public.usage_metrics TO authenticated;
GRANT ALL ON public.usage_metrics TO service_role;

ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view metrics" 
  ON public.usage_metrics FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to record current online count
CREATE OR REPLACE FUNCTION public.record_usage_metric() RETURNS void AS $$
DECLARE
  current_online INTEGER;
BEGIN
  -- Cleanup stale users first (older than 3 minutes)
  DELETE FROM public.online_users WHERE last_seen_at < now() - interval '3 minutes';
  
  -- Count active users
  SELECT count(*)::int INTO current_online FROM public.online_users;
  
  -- Record the metric
  INSERT INTO public.usage_metrics (online_count) VALUES (current_online);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
