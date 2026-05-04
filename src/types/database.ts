export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  whatsapp: string | null;
  has_discografias: boolean;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Musica {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  file_url: string | null;
  duration: number;
  file_size: number | null;
  categoria_id: string | null;
  drive_id: string | null;
  subfolder: string | null;
  created_at: string;
}

export interface MusicaWithCategoria extends Musica {
  categorias: Categoria | null;
}

export interface Favorito {
  id: string;
  user_id: string;
  musica_id: string;
  created_at: string;
  musicas: Musica;
}

export interface DownloadRecord {
  id: string;
  user_id: string;
  musica_id: string;
  created_at: string;
  musicas: Musica;
}

export interface Assinatura {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  price: number;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface GoogleDrive {
  id: string;
  name: string;
  drive_id: string;
  status: string;
  usage_percent: number;
  created_at: string;
}

export interface Afiliado {
  id: string;
  user_id: string;
  code: string;
  commission_percent: number;
  created_at: string;
}

export interface Indicacao {
  id: string;
  afiliado_id: string;
  referred_user_id: string | null;
  status: string;
  created_at: string;
}

export interface Anuncio {
  id: string;
  title: string;
  image_url: string | null;
  link: string | null;
  active: boolean;
  created_at: string;
}

export interface Notificacao {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}
