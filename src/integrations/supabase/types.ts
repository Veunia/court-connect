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
      game_sessions: {
        Row: {
          category: Database["public"]["Enums"]["session_category"]
          court: Database["public"]["Enums"]["court_type"]
          created_at: string
          end_time: string
          id: string
          location: string
          max_players: number
          organizer_id: string
          session_date: string
          space_id: string
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          title: string | null
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["session_category"]
          court?: Database["public"]["Enums"]["court_type"]
          created_at?: string
          end_time: string
          id?: string
          location: string
          max_players?: number
          organizer_id: string
          session_date: string
          space_id: string
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["session_category"]
          court?: Database["public"]["Enums"]["court_type"]
          created_at?: string
          end_time?: string
          id?: string
          location?: string
          max_players?: number
          organizer_id?: string
          session_date?: string
          space_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          avatar_url: string | null
          cancellations: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          matches_played: number
          position: string | null
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          avatar_url?: string | null
          cancellations?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          matches_played?: number
          position?: string | null
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          avatar_url?: string | null
          cancellations?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          matches_played?: number
          position?: string | null
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_events: {
        Row: {
          created_at: string
          id: number
          kind: string
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          kind: string
          success?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          kind?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      session_signups: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_signups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_waitlist: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_waitlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      space_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          space_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          space_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_invites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["space_role"]
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["space_role"]
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["space_role"]
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          invite_code_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code: string
          invite_code_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          invite_code_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["support_kind"] | null
          last_message_at: string
          status: Database["public"]["Enums"]["support_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["support_kind"] | null
          last_message_at?: string
          status?: Database["public"]["Enums"]["support_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["support_kind"] | null
          last_message_at?: string
          status?: Database["public"]["Enums"]["support_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      accept_pending_invites: { Args: never; Returns: number }
      consume_quota: {
        Args: { _kind: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      create_space: {
        Args: { _description: string; _name: string }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          invite_code_active: boolean
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "spaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      email_confirmed: { Args: never; Returns: boolean }
      export_my_data: { Args: never; Returns: Json }
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_space_admin: {
        Args: { _space: string; _user: string }
        Returns: boolean
      }
      is_space_member: {
        Args: { _space: string; _user: string }
        Returns: boolean
      }
      join_session: { Args: { _session: string }; Returns: Json }
      join_space_by_code: {
        Args: { _code: string }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          invite_code_active: boolean
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "spaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      join_space_by_code_safe: { Args: { _code: string }; Returns: Json }
      join_waitlist: { Args: { _session: string }; Returns: Json }
      leave_session: { Args: { _session: string }; Returns: Json }
      leave_waitlist: { Args: { _session: string }; Returns: Json }
      purge_my_account_data: { Args: never; Returns: Json }
      regenerate_invite_code: { Args: { _space: string }; Returns: string }
      session_in_my_space: { Args: { _session: string }; Returns: boolean }
      shares_space_with: { Args: { _user: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin"
      court_type: "demi" | "plein"
      session_category: "interieur" | "exterieur" | "tournoi"
      session_status: "active" | "annulee"
      space_role: "admin" | "member"
      support_kind: "probleme" | "suggestion" | "question"
      support_status: "nouveau" | "en_cours" | "traite" | "ignore"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin"],
      court_type: ["demi", "plein"],
      session_category: ["interieur", "exterieur", "tournoi"],
      session_status: ["active", "annulee"],
      space_role: ["admin", "member"],
      support_kind: ["probleme", "suggestion", "question"],
      support_status: ["nouveau", "en_cours", "traite", "ignore"],
    },
  },
} as const
