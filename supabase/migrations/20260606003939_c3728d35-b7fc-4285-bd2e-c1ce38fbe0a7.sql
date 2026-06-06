ALTER TABLE public.repertorios
  ADD COLUMN IF NOT EXISTS badge_text text,
  ADD COLUMN IF NOT EXISTS badge_bg_color text DEFAULT '#e11d48',
  ADD COLUMN IF NOT EXISTS badge_text_color text DEFAULT '#ffffff';