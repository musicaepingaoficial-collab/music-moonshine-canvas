
CREATE TABLE public.demo_play_log (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plays_used integer NOT NULL DEFAULT 0,
  last_track_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demo_play_log TO authenticated;
GRANT ALL ON public.demo_play_log TO service_role;

ALTER TABLE public.demo_play_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own counter (used by the demo banner)
CREATE POLICY "Users can view own demo log"
  ON public.demo_play_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for users — only the edge function (service_role) writes
