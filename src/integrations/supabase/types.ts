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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      document_types: {
        Row: {
          created_at: string
          description: string | null
          document_code: string
          document_type_full: string
          document_type_short: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_code: string
          document_type_full: string
          document_type_short?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_code?: string
          document_type_full?: string
          document_type_short?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rule_set_rules: {
        Row: {
          created_at: string
          id: string
          last_tested_at: string | null
          parameter_overrides: Json | null
          rule_id: string
          rule_set_id: string
          sort_order: number
          test_result: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_tested_at?: string | null
          parameter_overrides?: Json | null
          rule_id: string
          rule_set_id: string
          sort_order?: number
          test_result?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_tested_at?: string | null
          parameter_overrides?: Json | null
          rule_id?: string
          rule_set_id?: string
          sort_order?: number
          test_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_set_rules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_set_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_sets: {
        Row: {
          active_version: number
          client: string | null
          correspondent: string | null
          created_at: string
          description: string | null
          id: string
          last_updated_by: string | null
          name: string
          scope: string | null
          status: string
          updated_at: string
          use_case: string | null
          user_id: string
        }
        Insert: {
          active_version?: number
          client?: string | null
          correspondent?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_updated_by?: string | null
          name: string
          scope?: string | null
          status?: string
          updated_at?: string
          use_case?: string | null
          user_id: string
        }
        Update: {
          active_version?: number
          client?: string | null
          correspondent?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_updated_by?: string | null
          name?: string
          scope?: string | null
          status?: string
          updated_at?: string
          use_case?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rule_templates: {
        Row: {
          action: string | null
          config: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          scope: string | null
          trigger_condition: string | null
          type: Database["public"]["Enums"]["rule_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          scope?: string | null
          trigger_condition?: string | null
          type?: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          scope?: string | null
          trigger_condition?: string | null
          type?: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rules: {
        Row: {
          action: string | null
          category: string | null
          config: Json
          created_at: string
          description: string | null
          docling_mode_prompt: string | null
          docling_table_mode_prompt: string | null
          elements: Json | null
          id: string
          image_mode_prompt: string | null
          is_active: boolean | null
          name: string
          parameters: Json | null
          rule_code: string | null
          scope: string | null
          status: Database["public"]["Enums"]["rule_status"]
          subcategory: string | null
          subcategory2: string | null
          trigger_condition: string | null
          type: Database["public"]["Enums"]["rule_type"]
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          action?: string | null
          category?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          docling_mode_prompt?: string | null
          docling_table_mode_prompt?: string | null
          elements?: Json | null
          id?: string
          image_mode_prompt?: string | null
          is_active?: boolean | null
          name: string
          parameters?: Json | null
          rule_code?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["rule_status"]
          subcategory?: string | null
          subcategory2?: string | null
          trigger_condition?: string | null
          type?: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          action?: string | null
          category?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          docling_mode_prompt?: string | null
          docling_table_mode_prompt?: string | null
          elements?: Json | null
          id?: string
          image_mode_prompt?: string | null
          is_active?: boolean | null
          name?: string
          parameters?: Json | null
          rule_code?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["rule_status"]
          subcategory?: string | null
          subcategory2?: string | null
          trigger_condition?: string | null
          type?: Database["public"]["Enums"]["rule_type"]
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      template_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          object_id: string | null
          object_type: string
          template_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          object_id?: string | null
          object_type: string
          template_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          object_id?: string | null
          object_type?: string
          template_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_audit_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          rules_snapshot: Json
          template_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          rules_snapshot?: Json
          template_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          rules_snapshot?: Json
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          default_view: string
          id: string
          notifications_enabled: boolean
          sidebar_collapsed: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_view?: string
          id?: string
          notifications_enabled?: boolean
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_view?: string
          id?: string
          notifications_enabled?: boolean
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_rule_set: { Args: { p_rule_set_id: string }; Returns: boolean }
    }
    Enums: {
      rule_status: "draft" | "active" | "inactive" | "archived"
      rule_type:
        | "threshold"
        | "calculation"
        | "cross_table"
        | "data_presence"
        | "pattern_match"
        | "custom"
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
      rule_status: ["draft", "active", "inactive", "archived"],
      rule_type: [
        "threshold",
        "calculation",
        "cross_table",
        "data_presence",
        "pattern_match",
        "custom",
      ],
    },
  },
} as const
