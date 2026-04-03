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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      afiliados: {
        Row: {
          code: string
          commission_percent: number | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          commission_percent?: number | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          commission_percent?: number | null
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
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          link?: string | null
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
          price: number | null
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          price?: number | null
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          price?: number | null
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
          usage_percent: number | null
        }
        Insert: {
          created_at?: string
          drive_id: string
          id?: string
          name: string
          status?: string
          usage_percent?: number | null
        }
        Update: {
          created_at?: string
          drive_id?: string
          id?: string
          name?: string
          status?: string
          usage_percent?: number | null
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
          duration: number | null
          file_size: number | null
          file_url: string | null
          id: string
          subfolder: string | null
          title: string
        }
        Insert: {
          artist: string
          categoria_id?: string | null
          cover_url?: string | null
          created_at?: string
          drive_id?: string | null
          duration?: number | null
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
          duration?: number | null
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
          price: number
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
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id: string
          name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
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
    },
  },
} as const
