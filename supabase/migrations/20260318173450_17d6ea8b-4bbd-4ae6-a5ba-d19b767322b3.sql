
-- Profiles table (public user data)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categorias FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Google Drives
CREATE TABLE public.google_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  drive_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online',
  usage_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.google_drives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage drives" ON public.google_drives FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Musicas
CREATE TABLE public.musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_url TEXT,
  file_url TEXT,
  duration INTEGER DEFAULT 0,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  drive_id UUID REFERENCES public.google_drives(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.musicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view musicas" ON public.musicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage musicas" ON public.musicas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Assinaturas
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  price NUMERIC(10,2) DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON public.assinaturas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage subscriptions" ON public.assinaturas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Favoritos
CREATE TABLE public.favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, musica_id)
);
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.favoritos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favoritos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favoritos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Downloads
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own downloads" ON public.downloads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert downloads" ON public.downloads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Afiliados
CREATE TABLE public.afiliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  commission_percent NUMERIC(5,2) DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own affiliate" ON public.afiliados FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage affiliates" ON public.afiliados FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indicacoes
CREATE TABLE public.indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID NOT NULL REFERENCES public.afiliados(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own referrals" ON public.indicacoes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.afiliados WHERE id = afiliado_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage referrals" ON public.indicacoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Anuncios
CREATE TABLE public.anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  link TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active ads" ON public.anuncios FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Admins can manage ads" ON public.anuncios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
