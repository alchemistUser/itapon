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
      badges: {
        Row: {
          code: string
          how_en: string
          how_fil: string
          sort_order: number
          title_en: string
          title_fil: string
        }
        Insert: {
          code: string
          how_en: string
          how_fil: string
          sort_order?: number
          title_en: string
          title_fil: string
        }
        Update: {
          code?: string
          how_en?: string
          how_fil?: string
          sort_order?: number
          title_en?: string
          title_fil?: string
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          browser: string | null
          build: string
          created_at: string
          id: number
          kind: string
          message: string
          path: string
          stack: string | null
        }
        Insert: {
          browser?: string | null
          build: string
          created_at?: string
          id?: never
          kind: string
          message: string
          path: string
          stack?: string | null
        }
        Update: {
          browser?: string | null
          build?: string
          created_at?: string
          id?: never
          kind?: string
          message?: string
          path?: string
          stack?: string | null
        }
        Relationships: []
      }
      consents: {
        Row: {
          accepted_at: string
          id: number
          kind: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: never
          kind: string
          user_id?: string
          version: string
        }
        Update: {
          accepted_at?: string
          id?: never
          kind?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
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
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          note: string | null
          updated_at: string
        }
        Insert: {
          enabled: boolean
          key: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
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
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_class_key: string | null
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
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_class_key?: string | null
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
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_class_key?: string | null
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
          {
            foreignKeyName: "feedback_reviewed_class_key_fkey"
            columns: ["reviewed_class_key"]
            isOneToOne: false
            referencedRelation: "waste_items"
            referencedColumns: ["class_key"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          id: string
          join_code: string | null
          join_code_rotated_at: string | null
          location: string | null
          name: string
          points_enabled: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          join_code?: string | null
          join_code_rotated_at?: string | null
          location?: string | null
          name: string
          points_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string | null
          join_code_rotated_at?: string | null
          location?: string | null
          name?: string
          points_enabled?: boolean
        }
        Relationships: []
      }
      kiosk_heartbeats: {
        Row: {
          bucket: string
          device_id: string
        }
        Insert: {
          bucket: string
          device_id: string
        }
        Update: {
          bucket?: string
          device_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_heartbeats_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_pairings: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_tests: {
        Row: {
          answers: Json
          created_at: string
          form: string
          id: number
          institution_id: string | null
          participant_code: string
          score: number
          total: number
        }
        Insert: {
          answers: Json
          created_at?: string
          form: string
          id?: never
          institution_id?: string | null
          participant_code: string
          score: number
          total?: number
        }
        Update: {
          answers?: Json
          created_at?: string
          form?: string
          id?: never
          institution_id?: string | null
          participant_code?: string
          score?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_tests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      library_destinations: {
        Row: {
          code: string
          name_en: string
          name_fil: string
          sort_order: number
        }
        Insert: {
          code: string
          name_en: string
          name_fil: string
          sort_order?: number
        }
        Update: {
          code?: string
          name_en?: string
          name_fil?: string
          sort_order?: number
        }
        Relationships: []
      }
      library_dropoff_points: {
        Row: {
          address: string | null
          created_at: string
          destination_code: string
          hours: string | null
          id: string
          institution_id: string | null
          lgu: string | null
          map_url: string | null
          name: string
          notes: string | null
          sources: string[]
          status: string
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          destination_code: string
          hours?: string | null
          id?: string
          institution_id?: string | null
          lgu?: string | null
          map_url?: string | null
          name: string
          notes?: string | null
          sources?: string[]
          status?: string
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          destination_code?: string
          hours?: string | null
          id?: string
          institution_id?: string | null
          lgu?: string | null
          map_url?: string | null
          name?: string
          notes?: string | null
          sources?: string[]
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_dropoff_points_destination_code_fkey"
            columns: ["destination_code"]
            isOneToOne: false
            referencedRelation: "library_destinations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "library_dropoff_points_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      library_events: {
        Row: {
          created_at: string
          event: string
          id: number
          institution_id: string | null
          item_slug: string
          source: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: never
          institution_id?: string | null
          item_slug: string
          source: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: never
          institution_id?: string | null
          item_slug?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_events_item_slug_fkey"
            columns: ["item_slug"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["slug"]
          },
        ]
      }
      library_item_destinations: {
        Row: {
          destination_code: string
          item_slug: string
          rank: number
        }
        Insert: {
          destination_code: string
          item_slug: string
          rank: number
        }
        Update: {
          destination_code?: string
          item_slug?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_item_destinations_destination_code_fkey"
            columns: ["destination_code"]
            isOneToOne: false
            referencedRelation: "library_destinations"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "library_item_destinations_item_slug_fkey"
            columns: ["item_slug"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["slug"]
          },
        ]
      }
      library_items: {
        Row: {
          aliases: string[]
          bin: string
          detectable_class_key: string | null
          dont_en: string[]
          dont_fil: string[]
          fact_en: string | null
          fact_fil: string | null
          hazard_en: string | null
          hazard_fil: string | null
          material_code: string
          name_en: string
          name_fil: string
          note_en: string | null
          note_fil: string | null
          prep_en: Json
          prep_fil: Json
          reduce_en: string[]
          reduce_fil: string[]
          related: string[]
          resin_code: number | null
          reuse_en: string[]
          reuse_fil: string[]
          reviewed_at: string | null
          reviewed_by: string[]
          slug: string
          sources: string[]
          status: string
          summary_en: string
          summary_fil: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          aliases?: string[]
          bin: string
          detectable_class_key?: string | null
          dont_en?: string[]
          dont_fil?: string[]
          fact_en?: string | null
          fact_fil?: string | null
          hazard_en?: string | null
          hazard_fil?: string | null
          material_code: string
          name_en: string
          name_fil: string
          note_en?: string | null
          note_fil?: string | null
          prep_en?: Json
          prep_fil?: Json
          reduce_en?: string[]
          reduce_fil?: string[]
          related?: string[]
          resin_code?: number | null
          reuse_en?: string[]
          reuse_fil?: string[]
          reviewed_at?: string | null
          reviewed_by?: string[]
          slug: string
          sources?: string[]
          status?: string
          summary_en: string
          summary_fil?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          aliases?: string[]
          bin?: string
          detectable_class_key?: string | null
          dont_en?: string[]
          dont_fil?: string[]
          fact_en?: string | null
          fact_fil?: string | null
          hazard_en?: string | null
          hazard_fil?: string | null
          material_code?: string
          name_en?: string
          name_fil?: string
          note_en?: string | null
          note_fil?: string | null
          prep_en?: Json
          prep_fil?: Json
          reduce_en?: string[]
          reduce_fil?: string[]
          related?: string[]
          resin_code?: number | null
          reuse_en?: string[]
          reuse_fil?: string[]
          reviewed_at?: string | null
          reviewed_by?: string[]
          slug?: string
          sources?: string[]
          status?: string
          summary_en?: string
          summary_fil?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_items_bin_fkey"
            columns: ["bin"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "library_items_detectable_class_key_fkey"
            columns: ["detectable_class_key"]
            isOneToOne: false
            referencedRelation: "waste_items"
            referencedColumns: ["class_key"]
          },
          {
            foreignKeyName: "library_items_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "library_materials"
            referencedColumns: ["code"]
          },
        ]
      }
      library_local_rules: {
        Row: {
          created_at: string
          id: string
          institution_id: string | null
          item_slug: string | null
          lgu: string | null
          material_code: string | null
          note_en: string
          note_fil: string | null
          sources: string[]
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string | null
          item_slug?: string | null
          lgu?: string | null
          material_code?: string | null
          note_en: string
          note_fil?: string | null
          sources?: string[]
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string | null
          item_slug?: string | null
          lgu?: string | null
          material_code?: string | null
          note_en?: string
          note_fil?: string | null
          sources?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_local_rules_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_local_rules_item_slug_fkey"
            columns: ["item_slug"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "library_local_rules_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "library_materials"
            referencedColumns: ["code"]
          },
        ]
      }
      library_materials: {
        Row: {
          code: string
          default_bin: string | null
          description_en: string | null
          description_fil: string | null
          name_en: string
          name_fil: string
          parent_code: string | null
          resin_code: number | null
          sort_order: number
        }
        Insert: {
          code: string
          default_bin?: string | null
          description_en?: string | null
          description_fil?: string | null
          name_en: string
          name_fil: string
          parent_code?: string | null
          resin_code?: number | null
          sort_order?: number
        }
        Update: {
          code?: string
          default_bin?: string | null
          description_en?: string | null
          description_fil?: string | null
          name_en?: string
          name_fil?: string
          parent_code?: string | null
          resin_code?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_materials_default_bin_fkey"
            columns: ["default_bin"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "library_materials_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "library_materials"
            referencedColumns: ["code"]
          },
        ]
      }
      library_search_misses: {
        Row: {
          created_at: string
          id: number
          query: string
        }
        Insert: {
          created_at?: string
          id?: never
          query: string
        }
        Update: {
          created_at?: string
          id?: never
          query?: string
        }
        Relationships: []
      }
      library_sources: {
        Row: {
          id: string
          level: string
          title: string
          url: string | null
          verified: boolean
        }
        Insert: {
          id: string
          level: string
          title: string
          url?: string | null
          verified?: boolean
        }
        Update: {
          id?: string
          level?: string
          title?: string
          url?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      mission_activity: {
        Row: {
          created_at: string
          detail: string | null
          id: number
          item_slug: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: never
          item_slug: string
          kind: string
          user_id?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: never
          item_slug?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_activity_item_slug_fkey"
            columns: ["item_slug"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["slug"]
          },
        ]
      }
      missions: {
        Row: {
          code: string
          period: string
          points: number
          sort_order: number
          target: number
          title_en: string
          title_fil: string
        }
        Insert: {
          code: string
          period: string
          points: number
          sort_order?: number
          target: number
          title_en: string
          title_fil: string
        }
        Update: {
          code?: string
          period?: string
          points?: number
          sort_order?: number
          target?: number
          title_en?: string
          title_fil?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          kind: string
          mission_code: string | null
          period_key: string | null
          points: number
          reason: string | null
          reverses: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          kind: string
          mission_code?: string | null
          period_key?: string | null
          points: number
          reason?: string | null
          reverses?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          kind?: string
          mission_code?: string | null
          period_key?: string | null
          points?: number
          reason?: string | null
          reverses?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_mission_code_fkey"
            columns: ["mission_code"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "point_events_reverses_fkey"
            columns: ["reverses"]
            isOneToOne: false
            referencedRelation: "point_events"
            referencedColumns: ["id"]
          },
        ]
      }
      point_flags: {
        Row: {
          created_at: string
          day_key: string
          id: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_key: string
          id?: never
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_key?: string
          id?: never
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_private: {
        Row: {
          birth_year: number | null
          birth_year_edits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          birth_year_edits?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          birth_year?: number | null
          birth_year_edits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          handle_changed_at: string | null
          id: string
          institution_id: string | null
          institution_joined_at: string | null
          is_public: boolean
          leaderboard_hidden: boolean
          prefs: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          handle_changed_at?: string | null
          id: string
          institution_id?: string | null
          institution_joined_at?: string | null
          is_public?: boolean
          leaderboard_hidden?: boolean
          prefs?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          handle_changed_at?: string | null
          id?: string
          institution_id?: string | null
          institution_joined_at?: string | null
          is_public?: boolean
          leaderboard_hidden?: boolean
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
      quiz_answers: {
        Row: {
          answer: string
          correct: boolean
          created_at: string
          item_slug: string
          quiz_key: string
          user_id: string
        }
        Insert: {
          answer: string
          correct: boolean
          created_at?: string
          item_slug: string
          quiz_key: string
          user_id?: string
        }
        Update: {
          answer?: string
          correct?: boolean
          created_at?: string
          item_slug?: string
          quiz_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_item_slug_fkey"
            columns: ["item_slug"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["slug"]
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
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
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
      admin_points_stats: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
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
      admin_register_kiosk_code: {
        Args: {
          p_bin_order?: string[]
          p_code: string
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
      admin_remove_member: { Args: { p_user: string }; Returns: undefined }
      admin_reverse_points: {
        Args: { p_event: number; p_reason: string }
        Returns: undefined
      }
      admin_review_feedback: {
        Args: { p_class_key?: string; p_id: string; p_status: string }
        Returns: undefined
      }
      admin_rotate_join_code: { Args: never; Returns: string }
      admin_search_misses: {
        Args: { p_from: string; p_to: string }
        Returns: {
          last_seen: string
          query: string
          searches: number
        }[]
      }
      admin_set_leaderboard_hidden: {
        Args: { p_hidden: boolean; p_user: string }
        Returns: undefined
      }
      admin_set_points_enabled: {
        Args: { p_enabled: boolean }
        Returns: undefined
      }
      answer_quiz: {
        Args: { p_answer: string; p_key: string; p_slug: string }
        Returns: {
          correct: boolean
          right_bin: string
        }[]
      }
      claim_mission: {
        Args: { p_code: string }
        Returns: {
          points: number
          total: number
        }[]
      }
      daily_counts_by_category: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          category_key: string
          day: string
          detections: number
        }[]
      }
      daily_quiz: {
        Args: never
        Returns: {
          correct: boolean
          item_slug: string
          my_answer: string
          name_en: string
          name_fil: string
          quiz_key: string
          right_bin: string
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      delete_my_data: {
        Args: never
        Returns: {
          feedback_deleted: number
          scans_deleted: number
        }[]
      }
      export_my_data: { Args: never; Returns: Json }
      group_quiz: {
        Args: { p_group: string }
        Returns: {
          correct: boolean
          item_slug: string
          my_answer: string
          name_en: string
          name_fil: string
          quiz_key: string
          right_bin: string
        }[]
      }
      handle_available: { Args: { p_handle: string }; Returns: boolean }
      institution_leaderboard: {
        Args: { p_period: string }
        Returns: {
          avatar: string
          handle: string
          is_me: boolean
          points: number
          rank: number
        }[]
      }
      join_institution: {
        Args: { p_code: string }
        Returns: {
          institution_id: string
          name: string
        }[]
      }
      kiosk_heartbeat: { Args: never; Returns: undefined }
      kiosk_request_pairing: {
        Args: never
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      kiosk_uptime: {
        Args: { p_from: string; p_to: string }
        Returns: {
          buckets: number
          days: number
          device_id: string
          last_seen: string
        }[]
      }
      knowledge_test_items: {
        Args: never
        Returns: {
          n: number
          name_en: string
          name_fil: string
          slug: string
        }[]
      }
      leave_institution: { Args: never; Returns: undefined }
      library_event_counts: {
        Args: { p_from: string; p_to: string }
        Returns: {
          event: string
          everyone: number
          institution: number
          item_slug: string
        }[]
      }
      log_search_miss: { Args: { p_query: string }; Returns: undefined }
      mission_status: {
        Args: never
        Returns: {
          blocked: boolean
          claimed: boolean
          code: string
          period: string
          period_key: string
          points: number
          progress: number
          target: number
          title_en: string
          title_fil: string
        }[]
      }
      my_points: {
        Args: never
        Returns: {
          this_week: number
          today: number
          total: number
        }[]
      }
      my_progress: {
        Args: never
        Returns: {
          level: number
          streak: number
          total: number
        }[]
      }
      points_status: {
        Args: never
        Returns: {
          enabled: boolean
          reason: string
        }[]
      }
      purge_client_errors: { Args: { p_days?: number }; Returns: number }
      record_activity: {
        Args: { p_detail?: string; p_kind: string; p_slug: string }
        Returns: undefined
      }
      refresh_badges: { Args: never; Returns: string[] }
      submit_knowledge_test: {
        Args: { p_answers: Json; p_code: string; p_form: string }
        Returns: number
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
