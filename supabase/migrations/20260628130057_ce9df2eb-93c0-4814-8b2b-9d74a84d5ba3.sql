
CREATE TABLE public.tracking_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  placement text NOT NULL DEFAULT 'head' CHECK (placement IN ('head','body_start')),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tracking_snippets TO anon;
GRANT SELECT ON public.tracking_snippets TO authenticated;
GRANT ALL ON public.tracking_snippets TO service_role;

ALTER TABLE public.tracking_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled snippets"
  ON public.tracking_snippets FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can read all snippets"
  ON public.tracking_snippets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert snippets"
  ON public.tracking_snippets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update snippets"
  ON public.tracking_snippets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete snippets"
  ON public.tracking_snippets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tracking_snippets_updated_at
  BEFORE UPDATE ON public.tracking_snippets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
