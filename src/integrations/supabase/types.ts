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
          usage_percent: number
        }
        Insert: {
          created_at?: string
          drive_id: string
          id?: string
          name: string
          status?: string
          usage_percent?: number
        }
        Update: {
          created_at?: string
          drive_id?: string
          id?: string
          name?: string
          status?: string
          usage_percent?: number
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
          kwai_access_token: string | null
          kwai_enabled: boolean
          kwai_pixel_id: string | null
          meta_access_token: string | null
          meta_enabled: boolean
          meta_events: Json
          meta_pixel_id: string | null
          tiktok_access_token: string | null
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
          kwai_access_token?: string | null
          kwai_enabled?: boolean
          kwai_pixel_id?: string | null
          meta_access_token?: string | null
          meta_enabled?: boolean
          meta_events?: Json
          meta_pixel_id?: string | null
          tiktok_access_token?: string | null
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
          kwai_access_token?: string | null
          kwai_enabled?: boolean
          kwai_pixel_id?: string | null
          meta_access_token?: string | null
          meta_enabled?: boolean
          meta_events?: Json
          meta_pixel_id?: string | null
          tiktok_access_token?: string | null
          tiktok_enabled?: boolean
          tiktok_pixel_id?: string | null
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
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id: string
          name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          whatsapp?: string | null
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
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          maintenance_message: string
          maintenance_mode: boolean
          maintenance_title: string
          updated_at: string
          updated_by: string | null
          whatsapp_number: string | null
        }
        Insert: {
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          maintenance_title?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          maintenance_title?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
