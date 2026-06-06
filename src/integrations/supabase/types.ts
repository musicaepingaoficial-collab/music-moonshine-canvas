export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          device_info: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          device_info?: string | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          device_info?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_access_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      admin_notification_prefs: {
        Row: {
          notify_pix_generated: boolean
          notify_purchase: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          notify_pix_generated?: boolean
          notify_purchase?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          notify_pix_generated?: boolean
          notify_purchase?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_push_logs: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          error: string | null
          event_type: string
          id: string
          removed: number | null
          sent: number | null
          title: string | null
          total_subs: number | null
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          error?: string | null
          event_type: string
          id?: string
          removed?: number | null
          sent?: number | null
          title?: string | null
          total_subs?: number | null
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          error?: string | null
          event_type?: string
          id?: string
          removed?: number | null
          sent?: number | null
          title?: string | null
          total_subs?: number | null
          url?: string | null
        }
        Relationships: []
      }
      admin_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      afiliados: {
        Row: {
          code: string
          commission_percent: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          commission_percent?: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          commission_percent?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      anuncios: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          link: string | null
          position: number
          subtitle: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
          position?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
          position?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          anonymized_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          price: number
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          anonymized_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan: string
          price?: number
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          anonymized_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          price?: number
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      consent_logs: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          ip: string | null
          user_agent: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted: boolean
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      cupom_usos: {
        Row: {
          created_at: string | null
          cupom_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          cupom_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          cupom_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cupom_usos_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "cupons"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          data_expiracao: string | null
          desconto_percentual: number
          id: string
          updated_at: string | null
          uso_atual: number | null
          uso_limite: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          data_expiracao?: string | null
          desconto_percentual: number
          id?: string
          updated_at?: string | null
          uso_atual?: number | null
          uso_limite?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          data_expiracao?: string | null
          desconto_percentual?: number
          id?: string
          updated_at?: string | null
          uso_atual?: number | null
          uso_limite?: number | null
        }
        Relationships: []
      }
      demo_play_log: {
        Row: {
          created_at: string
          last_track_id: string | null
          plays_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_track_id?: string | null
          plays_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_track_id?: string | null
          plays_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discografias: {
        Row: {
          artista_nome: string
          created_at: string
          genero: string | null
          id: string
          imagem_url: string | null
          links: Json | null
          ordem: number | null
          updated_at: string
        }
        Insert: {
          artista_nome: string
          created_at?: string
          genero?: string | null
          id?: string
          imagem_url?: string | null
          links?: Json | null
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          artista_nome?: string
          created_at?: string
          genero?: string | null
          id?: string
          imagem_url?: string | null
          links?: Json | null
          ordem?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          created_at: string
          id: string
          musica_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          musica_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          musica_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_musica_id_fkey"
            columns: ["musica_id"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          created_at: string
          id: string
          musica_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          musica_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          musica_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_musica_id_fkey"
            columns: ["musica_id"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drives: {
        Row: {
          created_at: string
          drive_id: string
          id: string
          name: string
          status: string
          total_size_bytes: number | null
          usage_percent: number
          used_size_bytes: number | null
        }
        Insert: {
          created_at?: string
          drive_id: string
          id?: string
          name: string
          status?: string
          total_size_bytes?: number | null
          usage_percent?: number
          used_size_bytes?: number | null
        }
        Update: {
          created_at?: string
          drive_id?: string
          id?: string
          name?: string
          status?: string
          total_size_bytes?: number | null
          usage_percent?: number
          used_size_bytes?: number | null
        }
        Relationships: []
      }
      indicacoes: {
        Row: {
          afiliado_id: string
          created_at: string
          id: string
          referred_user_id: string | null
          status: string
        }
        Insert: {
          afiliado_id: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          status?: string
        }
        Update: {
          afiliado_id?: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicacoes_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_capi_logs: {
        Row: {
          created_at: string
          error: string | null
          event_id: string | null
          event_name: string
          events_received: number | null
          fbtrace_id: string | null
          id: string
          response: Json | null
          status_code: number | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_name: string
          events_received?: number | null
          fbtrace_id?: string | null
          id?: string
          response?: Json | null
          status_code?: number | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_name?: string
          events_received?: number | null
          fbtrace_id?: string | null
          id?: string
          response?: Json | null
          status_code?: number | null
        }
        Relationships: []
      }
      musicas: {
        Row: {
          artist: string
          categoria_id: string | null
          cover_url: string | null
          created_at: string
          drive_id: string | null
          duration: number
          file_size: number | null
          file_url: string | null
          id: string
          subfolder: string | null
          title: string
        }
        Insert: {
          artist?: string
          categoria_id?: string | null
          cover_url?: string | null
          created_at?: string
          drive_id?: string | null
          duration?: number
          file_size?: number | null
          file_url?: string | null
          id?: string
          subfolder?: string | null
          title: string
        }
        Update: {
          artist?: string
          categoria_id?: string | null
          cover_url?: string | null
          created_at?: string
          drive_id?: string | null
          duration?: number
          file_size?: number | null
          file_url?: string | null
          id?: string
          subfolder?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "musicas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "musicas_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "google_drives"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      online_users: {
        Row: {
          last_seen_at: string | null
          path: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          last_seen_at?: string | null
          path?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          last_seen_at?: string | null
          path?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pdf_purchases: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string | null
          pdf_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string | null
          pdf_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string | null
          pdf_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_purchases_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      pdfs: {
        Row: {
          access_type: Database["public"]["Enums"]["pdf_access_type"]
          active: boolean
          author: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number
          id: string
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["pdf_access_type"]
          active?: boolean
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number
          id?: string
          price?: number
          title: string
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["pdf_access_type"]
          active?: boolean
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number
          id?: string
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_subscriptions: {
        Row: {
          approved_at: string | null
          claim_token: string
          claimed_at: string | null
          claimed_user_id: string | null
          cpf: string
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          mp_payment_id: number | null
          payment_method: string | null
          plan: string
          price: number
          status: string
          whatsapp: string
        }
        Insert: {
          approved_at?: string | null
          claim_token?: string
          claimed_at?: string | null
          claimed_user_id?: string | null
          cpf: string
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          mp_payment_id?: number | null
          payment_method?: string | null
          plan: string
          price?: number
          status?: string
          whatsapp: string
        }
        Update: {
          approved_at?: string | null
          claim_token?: string
          claimed_at?: string | null
          claimed_user_id?: string | null
          cpf?: string
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          mp_payment_id?: number | null
          payment_method?: string | null
          plan?: string
          price?: number
          status?: string
          whatsapp?: string
        }
        Relationships: []
      }
      pixel_settings: {
        Row: {
          ga4_enabled: boolean
          ga4_measurement_id: string | null
          google_ads_conversion_id: string | null
          google_ads_enabled: boolean
          google_ads_labels: Json
          gtm_container_id: string | null
          gtm_enabled: boolean
          id: string
          kwai_enabled: boolean
          kwai_pixel_id: string | null
          meta_enabled: boolean
          meta_events: Json
          meta_pixel_id: string | null
          meta_test_event_code: string | null
          tiktok_enabled: boolean
          tiktok_pixel_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_enabled?: boolean
          google_ads_labels?: Json
          gtm_container_id?: string | null
          gtm_enabled?: boolean
          id?: string
          kwai_enabled?: boolean
          kwai_pixel_id?: string | null
          meta_enabled?: boolean
          meta_events?: Json
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          tiktok_enabled?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_enabled?: boolean
          google_ads_labels?: Json
          gtm_container_id?: string | null
          gtm_enabled?: boolean
          id?: string
          kwai_enabled?: boolean
          kwai_pixel_id?: string | null
          meta_enabled?: boolean
          meta_events?: Json
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          tiktok_enabled?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pixel_settings_secrets: {
        Row: {
          id: string
          kwai_access_token: string | null
          meta_access_token: string | null
          tiktok_access_token: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          kwai_access_token?: string | null
          meta_access_token?: string | null
          tiktok_access_token?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          kwai_access_token?: string | null
          meta_access_token?: string | null
          tiktok_access_token?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      planos: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_days: number | null
          id: string
          name: string
          price: number
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          name: string
          price?: number
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          name?: string
          price?: number
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          anonymized_at: string | null
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string
          has_discografias: boolean | null
          id: string
          name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          anonymized_at?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          has_discografias?: boolean | null
          id: string
          name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          anonymized_at?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          has_discografias?: boolean | null
          id?: string
          name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      repertorio_musicas: {
        Row: {
          created_at: string
          id: string
          musica_id: string
          repertorio_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          musica_id: string
          repertorio_id: string
        }
        Update: {
          created_at?: string
          id?: string
          musica_id?: string
          repertorio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repertorio_musicas_musica_id_fkey"
            columns: ["musica_id"]
            isOneToOne: false
            referencedRelation: "musicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repertorio_musicas_repertorio_id_fkey"
            columns: ["repertorio_id"]
            isOneToOne: false
            referencedRelation: "repertorios"
            referencedColumns: ["id"]
          },
        ]
      }
      repertorios: {
        Row: {
          badge_bg_color: string | null
          badge_text: string | null
          badge_text_color: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          featured: boolean | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          badge_bg_color?: string | null
          badge_text?: string | null
          badge_text_color?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          badge_bg_color?: string | null
          badge_text?: string | null
          badge_text_color?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sales_page_views: {
        Row: {
          created_at: string
          id: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          discografias_valor: number | null
          id: string
          maintenance_message: string
          maintenance_mode: boolean
          maintenance_title: string
          sales_video_url: string | null
          updated_at: string
          updated_by: string | null
          whatsapp_number: string | null
        }
        Insert: {
          discografias_valor?: number | null
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          maintenance_title?: string
          sales_video_url?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          discografias_valor?: number | null
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          maintenance_title?: string
          sales_video_url?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          login_info: string | null
          name: string
          notes: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          login_info?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          login_info?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      tutoriais: {
        Row: {
          conteudo: string | null
          created_at: string
          id: string
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          id?: string
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          id: string
          online_count: number
          timestamp: string | null
        }
        Insert: {
          id?: string
          online_count: number
          timestamp?: string | null
        }
        Update: {
          id?: string
          online_count?: number
          timestamp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      welcome_popup: {
        Row: {
          active: boolean
          cta_label: string | null
          description: string
          discount_coupon: string | null
          discount_percent: number | null
          exclude_plan_slugs: string[] | null
          id: string
          image_url: string | null
          include_plan_slugs: string[] | null
          links: Json
          new_user_days: number
          plan_slug: string | null
          priority: number | null
          show_to_new: boolean
          show_to_subscribers: boolean
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          active?: boolean
          cta_label?: string | null
          description?: string
          discount_coupon?: string | null
          discount_percent?: number | null
          exclude_plan_slugs?: string[] | null
          id?: string
          image_url?: string | null
          include_plan_slugs?: string[] | null
          links?: Json
          new_user_days?: number
          plan_slug?: string | null
          priority?: number | null
          show_to_new?: boolean
          show_to_subscribers?: boolean
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          active?: boolean
          cta_label?: string | null
          description?: string
          discount_coupon?: string | null
          discount_percent?: number | null
          exclude_plan_slugs?: string[] | null
          id?: string
          image_url?: string | null
          include_plan_slugs?: string[] | null
          links?: Json
          new_user_days?: number
          plan_slug?: string | null
          priority?: number | null
          show_to_new?: boolean
          show_to_subscribers?: boolean
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_online_users: { Args: never; Returns: undefined }
      has_pdf_access: {
        Args: { _pdf_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_usage_metric: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      pdf_access_type: "paid" | "subscriber_bonus"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      pdf_access_type: ["paid", "subscriber_bonus"],
    },
  },
} as const
