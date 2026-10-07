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
      api_keys: {
        Row: {
          active: boolean
          call_count: number
          created_at: string
          created_by: string | null
          created_by_name: string
          expires_at: string | null
          id: string
          key_hash: string
          label: string
          last_used_at: string | null
          prefix: string
          scopes: string[]
        }
        Insert: {
          active?: boolean
          call_count?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          label: string
          last_used_at?: string | null
          prefix: string
          scopes?: string[]
        }
        Update: {
          active?: boolean
          call_count?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          label?: string
          last_used_at?: string | null
          prefix?: string
          scopes?: string[]
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          after_value: string
          before_value: string
          entity: string
          id: number
          property: string
          reason: string | null
          signed: boolean
          ts: string
          version: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          after_value?: string
          before_value?: string
          entity: string
          id?: number
          property?: string
          reason?: string | null
          signed?: boolean
          ts?: string
          version?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          after_value?: string
          before_value?: string
          entity?: string
          id?: number
          property?: string
          reason?: string | null
          signed?: boolean
          ts?: string
          version?: string | null
        }
        Relationships: []
      }
      integration_messages: {
        Row: {
          attempts: number
          created_at: string
          direction: string
          event: string
          id: number
          integration_id: string
          payload: Json
          response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          direction: string
          event: string
          id?: number
          integration_id: string
          payload?: Json
          response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          direction?: string
          event?: string
          id?: number
          integration_id?: string
          payload?: Json
          response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: number
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: number
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: number
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          approved_by: string[]
          branch_label: string | null
          classification: string
          code: string
          compliance: Json
          created_at: string
          created_by: string | null
          created_by_name: string
          id: string
          items: Json
          name: string
          parent_id: string | null
          process: Json
          project: string
          status: string
          target_yield: Json
          updated_at: string
          version: string
        }
        Insert: {
          approved_by?: string[]
          branch_label?: string | null
          classification?: string
          code: string
          compliance?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          items?: Json
          name: string
          parent_id?: string | null
          process?: Json
          project?: string
          status?: string
          target_yield?: Json
          updated_at?: string
          version?: string
        }
        Update: {
          approved_by?: string[]
          branch_label?: string | null
          classification?: string
          code?: string
          compliance?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          items?: Json
          name?: string
          parent_id?: string | null
          process?: Json
          project?: string
          status?: string
          target_yield?: Json
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      rms_records: {
        Row: {
          created_by: string | null
          data: Json
          id: string
          kind: string
          updated_at: string
        }
        Insert: {
          created_by?: string | null
          data?: Json
          id: string
          kind: string
          updated_at?: string
        }
        Update: {
          created_by?: string | null
          data?: Json
          id?: string
          kind?: string
          updated_at?: string
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
      can_write_record: { Args: { _kind: string }; Returns: boolean }
      create_api_key: {
        Args: { _expires_at?: string; _label: string; _scopes: string[] }
        Returns: string
      }
      current_actor_name: { Args: never; Returns: string }
      ensure_profile: { Args: { _full_name?: string }; Returns: undefined }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_event: {
        Args: {
          _action: string
          _after: string
          _entity: string
          _property: string
          _version?: string
        }
        Returns: undefined
      }
      new_recipe_version: {
        Args: { _copy?: boolean; _id: string }
        Returns: string
      }
      notify_role: {
        Args: {
          _body: string
          _link: string
          _role: Database["public"]["Enums"]["app_role"]
          _title: string
        }
        Returns: undefined
      }
      transition_recipe: {
        Args: { _action: string; _id: string; _reason?: string; _sig?: string }
        Returns: string
      }
      write_audit: {
        Args: {
          _action: string
          _after: string
          _before: string
          _entity: string
          _property: string
          _reason: string
          _version: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "recipe_engineer"
        | "qa_manager"
        | "production_manager"
        | "operator"
        | "admin"
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
      app_role: [
        "recipe_engineer",
        "qa_manager",
        "production_manager",
        "operator",
        "admin",
      ],
    },
  },
} as const
