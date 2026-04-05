
-- =============================================
-- ENUM
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =============================================
-- TABLES
-- =============================================

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Google Drives
CREATE TABLE public.google_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  drive_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online',
  usage_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Musicas
CREATE TABLE public.musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Desconhecido',
  cover_url TEXT,
  file_url TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  file_size BIGINT DEFAULT 0,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  drive_id UUID REFERENCES public.google_drives(id) ON DELETE SET NULL,
  subfolder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Favoritos
CREATE TABLE public.favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, musica_id)
);

-- Downloads
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Planos
CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_days INTEGER,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assinaturas
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price NUMERIC NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Afiliados
CREATE TABLE public.afiliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code TEXT NOT NULL UNIQUE,
  commission_percent NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indicacoes
CREATE TABLE public.indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anuncios
CREATE TABLE public.anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  link TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notificacoes
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Repertorios
CREATE TABLE public.repertorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Repertorio Musicas (junction)
CREATE TABLE public.repertorio_musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repertorio_id UUID NOT NULL REFERENCES public.repertorios(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repertorio_id, musica_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_musicas_categoria ON public.musicas(categoria_id);
CREATE INDEX idx_musicas_drive ON public.musicas(drive_id);
CREATE INDEX idx_favoritos_user ON public.favoritos(user_id);
CREATE INDEX idx_downloads_user ON public.downloads(user_id);
CREATE INDEX idx_assinaturas_user_status ON public.assinaturas(user_id, status);
CREATE INDEX idx_repertorios_user ON public.repertorios(user_id);
CREATE INDEX idx_repertorio_musicas_repertorio ON public.repertorio_musicas(repertorio_id);
CREATE INDEX idx_notificacoes_user ON public.notificacoes(user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS
-- =============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User Roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Categorias (public read)
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categorias" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categorias" ON public.categorias FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Google Drives
ALTER TABLE public.google_drives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage drives" ON public.google_drives FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Musicas (public read for authenticated)
ALTER TABLE public.musicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read musicas" ON public.musicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage musicas" ON public.musicas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Favoritos
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favoritos" ON public.favoritos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Downloads
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own downloads" ON public.downloads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own downloads" ON public.downloads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all downloads" ON public.downloads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Planos (public read)
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read planos" ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage planos" ON public.planos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Assinaturas
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assinaturas" ON public.assinaturas FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage assinaturas" ON public.assinaturas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Afiliados
ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own afiliado" ON public.afiliados FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage afiliados" ON public.afiliados FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indicacoes
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage indicacoes" ON public.indicacoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Anuncios (public read)
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active anuncios" ON public.anuncios FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Admins can manage anuncios" ON public.anuncios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notificacoes
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notificacoes" ON public.notificacoes FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own notificacoes" ON public.notificacoes FOR UPDATE TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Admins can manage notificacoes" ON public.notificacoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Repertorios
ALTER TABLE public.repertorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own repertorios" ON public.repertorios FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all repertorios" ON public.repertorios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Repertorio Musicas
ALTER TABLE public.repertorio_musicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own repertorio musicas" ON public.repertorio_musicas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.repertorios r WHERE r.id = repertorio_id AND r.user_id = auth.uid()));
CREATE POLICY "Admins can manage all repertorio musicas" ON public.repertorio_musicas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- STORAGE
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('repertorio-covers', 'repertorio-covers', true);

CREATE POLICY "Anyone can read covers" ON storage.objects FOR SELECT USING (bucket_id = 'repertorio-covers');
CREATE POLICY "Authenticated can upload covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'repertorio-covers');
CREATE POLICY "Users can update own covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'repertorio-covers');
