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
      attendance: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          marked_by: string | null
          status: string
          student_id: string
          time_slot_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id: string
          time_slot_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id?: string
          time_slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          aluno_id: string
          booking_date: string
          created_at: string
          id: string
          status: string
          time_slot_id: string
        }
        Insert: {
          aluno_id: string
          booking_date: string
          created_at?: string
          id?: string
          status?: string
          time_slot_id: string
        }
        Update: {
          aluno_id?: string
          booking_date?: string
          created_at?: string
          id?: string
          status?: string
          time_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          created_at: string
          credits_total: number
          credits_used: number
          id: string
          student_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          credits_total: number
          credits_used?: number
          id?: string
          student_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          student_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      fixed_booking_exceptions: {
        Row: {
          created_at: string
          exception_date: string
          fixed_booking_id: string
          id: string
        }
        Insert: {
          created_at?: string
          exception_date: string
          fixed_booking_id: string
          id?: string
        }
        Update: {
          created_at?: string
          exception_date?: string
          fixed_booking_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_booking_exceptions_fixed_booking_id_fkey"
            columns: ["fixed_booking_id"]
            isOneToOne: false
            referencedRelation: "fixed_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_bookings: {
        Row: {
          aluno_id: string
          approval_status: string
          created_at: string
          end_date: string | null
          id: string
          start_date: string | null
          time_slot_id: string
        }
        Insert: {
          aluno_id: string
          approval_status?: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          time_slot_id: string
        }
        Update: {
          aluno_id?: string
          approval_status?: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          time_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_bookings_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          city: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          approval_status?: string
          city?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          approval_status?: string
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      student_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          plan_type: Database["public"]["Enums"]["plan_type"]
          student_id: string
          updated_at: string
          weekly_credits: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_type: Database["public"]["Enums"]["plan_type"]
          student_id: string
          updated_at?: string
          weekly_credits?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_type?: Database["public"]["Enums"]["plan_type"]
          student_id?: string
          updated_at?: string
          weekly_credits?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          capacity: number
          created_at: string
          day_of_week: number
          duration_minutes: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          day_of_week: number
          duration_minutes?: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
        }
        Update: {
          capacity?: number
          created_at?: string
          day_of_week?: number
          duration_minutes?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
        }
        Relationships: []
      }
      trial_classes: {
        Row: {
          booking_date: string | null
          created_at: string | null
          id: string
          scheduled_by: string | null
          status: string
          student_id: string
          time_slot_id: string | null
        }
        Insert: {
          booking_date?: string | null
          created_at?: string | null
          id?: string
          scheduled_by?: string | null
          status?: string
          student_id: string
          time_slot_id?: string | null
        }
        Update: {
          booking_date?: string | null
          created_at?: string | null
          id?: string
          scheduled_by?: string | null
          status?: string
          student_id?: string
          time_slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_classes_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_classes_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_booking_with_refund: {
        Args: { p_booking_id: string }
        Returns: string
      }
      consume_credit:
        | { Args: { p_student_id: string }; Returns: boolean }
        | { Args: { p_date?: string; p_student_id: string }; Returns: boolean }
      get_credit_week_start: {
        Args: { p_date?: string; p_time?: string }
        Returns: string
      }
      get_or_create_weekly_credits:
        | {
            Args: { p_student_id: string }
            Returns: {
              credits_total: number
              credits_used: number
              week_start: string
            }[]
          }
        | {
            Args: { p_date?: string; p_student_id: string }
            Returns: {
              credits_total: number
              credits_used: number
              week_start: string
            }[]
          }
      get_week_start: { Args: { p_date: string }; Returns: string }
      is_professor: { Args: { _user_id: string }; Returns: boolean }
      refund_credit: {
        Args: { p_booking_date: string; p_student_id: string }
        Returns: boolean
      }
      skip_fixed_day_with_refund: {
        Args: { p_exception_date: string; p_fixed_booking_id: string }
        Returns: string
      }
    }
    Enums: {
      plan_type: "2x" | "3x" | "experimental"
      user_role: "aluno" | "professor"
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
      plan_type: ["2x", "3x", "experimental"],
      user_role: ["aluno", "professor"],
    },
  },
} as const
<claude-code-hint v="1" type="plugin" value="supabase@claude-plugins-official" />
A new version of Supabase CLI is available: v2.101.0 (currently installed v2.98.2)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
