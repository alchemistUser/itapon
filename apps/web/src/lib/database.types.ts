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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      devices: {
        Row: {
          bin_order: string[]
          created_at: string
          id: string
          institution_id: string
          kiosk_user_id: string | null
          label: string
          location_note: string | null
        }
        Insert: {
          bin_order?: string[]
          created_at?: string
          id?: string
          institution_id: string
          kiosk_user_id?: string | null
          label: string
          location_note?: string | null
        }
        Update: {
          bin_order?: string[]
          created_at?: string
          id?: string
          institution_id?: string
          kiosk_user_id?: string | null
          label?: string
          location_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          consent: boolean
          corrected_class_key: string | null
          created_at: string
          detection_id: string | null
          id: string
          image_path: string | null
          is_correct: boolean
          model_version: string | null
          user_id: string
        }
        Insert: {
          consent?: boolean
          corrected_class_key?: string | null
          created_at?: string
          detection_id?: string | null
          id?: string
          image_path?: string | null
          is_correct: boolean
          model_version?: string | null
          user_id?: string
        }
        Update: {
          consent?: boolean
          corrected_class_key?: string | null
          created_at?: string
          detection_id?: string | null
          id?: string
          image_path?: string | null
          is_correct?: boolean
          model_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_corrected_class_key_fkey"
            columns: ["corrected_class_key"]
            isOneToOne: false
            referencedRelation: "waste_items"
            referencedColumns: ["class_key"]
          },
          {
            foreignKeyName: "feedback_detection_id_fkey"
            columns: ["detection_id"]
            isOneToOne: false
            referencedRelation: "scan_detections"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          institution_id: string | null
          prefs: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          institution_id?: string | null
          prefs?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          institution_id?: string | null
          prefs?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_detections: {
        Row: {
          bbox: Json
          category_key: string
          class_key: string
          confidence: number
          created_at: string
          id: string
          is_primary: boolean
          session_id: string
        }
        Insert: {
          bbox: Json
          category_key: string
          class_key: string
          confidence: number
          created_at?: string
          id?: string
          is_primary?: boolean
          session_id: string
        }
        Update: {
          bbox?: Json
          category_key?: string
          class_key?: string
          confidence?: number
          created_at?: string
          id?: string
          is_primary?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_detections_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "scan_detections_class_key_fkey"
            columns: ["class_key"]
            isOneToOne: false
            referencedRelation: "waste_items"
            referencedColumns: ["class_key"]
          },
          {
            foreignKeyName: "scan_detections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_sessions: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          inference_backend: string | null
          institution_id: string | null
          latency_ms: number | null
          model_version: string
          source: Database["public"]["Enums"]["scan_source"]
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          inference_backend?: string | null
          institution_id?: string | null
          latency_ms?: number | null
          model_version: string
          source?: Database["public"]["Enums"]["scan_source"]
          user_id?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          inference_backend?: string | null
          institution_id?: string | null
          latency_ms?: number | null
          model_version?: string
          source?: Database["public"]["Enums"]["scan_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_categories: {
        Row: {
          bin_color: string
          bin_label: string
          description: string
          examples: string
          icon: string
          key: string
          name: string
          ra9003_term: string
          sort_order: number
        }
        Insert: {
          bin_color: string
          bin_label: string
          description: string
          examples: string
          icon?: string
          key: string
          name: string
          ra9003_term: string
          sort_order: number
        }
        Update: {
          bin_color?: string
          bin_label?: string
          description?: string
          examples?: string
          icon?: string
          key?: string
          name?: string
          ra9003_term?: string
          sort_order?: number
        }
        Relationships: []
      }
      waste_items: {
        Row: {
          category_key: string
          class_key: string
          contamination_note: string | null
          created_at: string
          display_name: string
          display_name_fil: string | null
          id: string
          is_detectable: boolean
          prep_steps: Json
          reuse_tip: string | null
          rule_source: string | null
          search_aliases: string[]
          short_instruction: string
          updated_at: string
          why_text: string | null
        }
        Insert: {
          category_key: string
          class_key: string
          contamination_note?: string | null
          created_at?: string
          display_name: string
          display_name_fil?: string | null
          id?: string
          is_detectable?: boolean
          prep_steps?: Json
          reuse_tip?: string | null
          rule_source?: string | null
          search_aliases?: string[]
          short_instruction: string
          updated_at?: string
          why_text?: string | null
        }
        Update: {
          category_key?: string
          class_key?: string
          contamination_note?: string | null
          created_at?: string
          display_name?: string
          display_name_fil?: string | null
          id?: string
          is_detectable?: boolean
          prep_steps?: Json
          reuse_tip?: string | null
          rule_source?: string | null
          search_aliases?: string[]
          short_instruction?: string
          updated_at?: string
          why_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waste_items_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_register_kiosk: {
        Args: {
          p_bin_order?: string[]
          p_email: string
          p_label: string
          p_location?: string
        }
        Returns: {
          bin_order: string[]
          created_at: string
          id: string
          institution_id: string
          kiosk_user_id: string | null
          label: string
          location_note: string | null
        }
        SetofOptions: {
          from: "*"
          to: "devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      daily_counts_by_category: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          category_key: string
          day: string
          detections: number
        }[]
      }
      delete_my_data: {
        Args: never
        Returns: {
          feedback_deleted: number
          scans_deleted: number
        }[]
      }
      top_items: {
        Args: { p_from?: string; p_limit?: number; p_to?: string }
        Returns: {
          category_key: string
          class_key: string
          detections: number
          display_name: string
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin" | "kiosk"
      scan_source: "mobile" | "kiosk" | "desktop"
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
      app_role: ["user", "admin", "kiosk"],
      scan_source: ["mobile", "kiosk", "desktop"],
    },
  },
} as const
