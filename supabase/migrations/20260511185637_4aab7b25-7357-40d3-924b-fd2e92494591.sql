CREATE TABLE public.active_sessions (
  user_id uuid PRIMARY KEY,
  session_id text NOT NULL,
  device_info text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active session"
ON public.active_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own active session"
ON public.active_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own active session"
ON public.active_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own active session"
ON public.active_sessions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;

CREATE TRIGGER active_sessions_updated_at
BEFORE UPDATE ON public.active_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();