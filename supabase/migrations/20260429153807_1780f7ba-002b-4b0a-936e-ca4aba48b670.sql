-- Inscrições Web Push de admins
CREATE TABLE public.admin_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_admin_push_user ON public.admin_push_subscriptions(user_id);

CREATE POLICY "Users manage own subscriptions"
ON public.admin_push_subscriptions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
ON public.admin_push_subscriptions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Preferências por admin
CREATE TABLE public.admin_notification_prefs (
  user_id uuid PRIMARY KEY,
  notify_purchase boolean NOT NULL DEFAULT true,
  notify_pix_generated boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs"
ON public.admin_notification_prefs FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all prefs"
ON public.admin_notification_prefs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_admin_notification_prefs_updated_at
BEFORE UPDATE ON public.admin_notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();