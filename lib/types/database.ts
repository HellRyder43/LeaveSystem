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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          reason: string | null
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          acting_manager_id: string | null
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          acting_manager_id?: string | null
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          acting_manager_id?: string | null
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_acting_manager_id_fkey"
            columns: ["acting_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          allocated: number
          carried_forward: number
          carried_forward_expiry: string | null
          encashed: number
          id: string
          leave_type_id: string
          used: number
          user_id: string
          year: number
        }
        Insert: {
          allocated?: number
          carried_forward?: number
          carried_forward_expiry?: string | null
          encashed?: number
          id?: string
          leave_type_id: string
          used?: number
          user_id: string
          year: number
        }
        Update: {
          allocated?: number
          carried_forward?: number
          carried_forward_expiry?: string | null
          encashed?: number
          id?: string
          leave_type_id?: string
          used?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_encashment_log: {
        Row: {
          created_at: string
          days_encashed: number
          id: string
          leave_type_id: string
          triggered_by: Database["public"]["Enums"]["encashment_trigger_enum"]
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          days_encashed: number
          id?: string
          leave_type_id: string
          triggered_by: Database["public"]["Enums"]["encashment_trigger_enum"]
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          days_encashed?: number
          id?: string
          leave_type_id?: string
          triggered_by?: Database["public"]["Enums"]["encashment_trigger_enum"]
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_encashment_log_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_encashment_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approver_comment: string | null
          approver_id: string | null
          attachment_url: string | null
          covering_employee_id: string | null
          created_at: string
          delegate_approver_id: string | null
          duration_days: number
          duration_modifier: Database["public"]["Enums"]["duration_modifier_enum"]
          end_date: string
          escalated_at: string | null
          id: string
          is_backdated: boolean
          is_cross_year: boolean
          leave_type_id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approver_comment?: string | null
          approver_id?: string | null
          attachment_url?: string | null
          covering_employee_id?: string | null
          created_at?: string
          delegate_approver_id?: string | null
          duration_days: number
          duration_modifier?: Database["public"]["Enums"]["duration_modifier_enum"]
          end_date: string
          escalated_at?: string | null
          id?: string
          is_backdated?: boolean
          is_cross_year?: boolean
          leave_type_id: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approver_comment?: string | null
          approver_id?: string | null
          attachment_url?: string | null
          covering_employee_id?: string | null
          created_at?: string
          delegate_approver_id?: string | null
          duration_days?: number
          duration_modifier?: Database["public"]["Enums"]["duration_modifier_enum"]
          end_date?: string
          escalated_at?: string | null
          id?: string
          is_backdated?: boolean
          is_cross_year?: boolean
          leave_type_id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_covering_employee_id_fkey"
            columns: ["covering_employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_delegate_approver_id_fkey"
            columns: ["delegate_approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_type_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_type_configs: {
        Row: {
          allow_half_day: boolean
          attachment_required_after_days: number
          default_quota: number
          gender_restriction: Database["public"]["Enums"]["gender_restriction_enum"]
          id: string
          is_active: boolean
          is_carry_forward_allowed: boolean
          is_paid: boolean
          max_carry_forward_days: number
          name: string
          requires_attachment: boolean
        }
        Insert: {
          allow_half_day?: boolean
          attachment_required_after_days?: number
          default_quota: number
          gender_restriction?: Database["public"]["Enums"]["gender_restriction_enum"]
          id?: string
          is_active?: boolean
          is_carry_forward_allowed?: boolean
          is_paid?: boolean
          max_carry_forward_days?: number
          name: string
          requires_attachment?: boolean
        }
        Update: {
          allow_half_day?: boolean
          attachment_required_after_days?: number
          default_quota?: number
          gender_restriction?: Database["public"]["Enums"]["gender_restriction_enum"]
          id?: string
          is_active?: boolean
          is_carry_forward_allowed?: boolean
          is_paid?: boolean
          max_carry_forward_days?: number
          name?: string
          requires_attachment?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          related_request_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_request_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_request_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      public_holidays: {
        Row: {
          date: string
          department_id: string | null
          id: string
          name: string
        }
        Insert: {
          date: string
          department_id?: string | null
          id?: string
          name: string
        }
        Update: {
          date?: string
          department_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_holidays_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          approval_sla_days: number
          backdated_leave_window_days: number
          carry_forward_expiry_month: number
          encashment_enabled: boolean
          entitlement_tier_2to5: number
          entitlement_tier_gt5: number
          entitlement_tier_lt2: number
          id: string
          leave_year_start_month: number
        }
        Insert: {
          approval_sla_days?: number
          backdated_leave_window_days?: number
          carry_forward_expiry_month?: number
          encashment_enabled?: boolean
          entitlement_tier_2to5?: number
          entitlement_tier_gt5?: number
          entitlement_tier_lt2?: number
          id?: string
          leave_year_start_month?: number
        }
        Update: {
          approval_sla_days?: number
          backdated_leave_window_days?: number
          carry_forward_expiry_month?: number
          encashment_enabled?: boolean
          entitlement_tier_2to5?: number
          entitlement_tier_gt5?: number
          entitlement_tier_lt2?: number
          id?: string
          leave_year_start_month?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          join_date: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          join_date: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          join_date?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_department_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      duration_modifier_enum: "Full" | "First Half" | "Second Half"
      encashment_trigger_enum: "System" | "Admin"
      gender_restriction_enum: "None" | "Male" | "Female"
      leave_status: "Pending" | "Approved" | "Rejected" | "Cancelled"
      notification_type_enum:
        | "LeaveSubmitted"
        | "LeaveApproved"
        | "LeaveRejected"
        | "LeaveCancelled"
        | "ApprovalReminder"
        | "EscalationAlert"
        | "DelegateAssigned"
        | "YearEndSummary"
      user_role: "Employee" | "Manager" | "Admin"
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
      duration_modifier_enum: ["Full", "First Half", "Second Half"],
      encashment_trigger_enum: ["System", "Admin"],
      gender_restriction_enum: ["None", "Male", "Female"],
      leave_status: ["Pending", "Approved", "Rejected", "Cancelled"],
      notification_type_enum: [
        "LeaveSubmitted",
        "LeaveApproved",
        "LeaveRejected",
        "LeaveCancelled",
        "ApprovalReminder",
        "EscalationAlert",
        "DelegateAssigned",
        "YearEndSummary",
      ],
      user_role: ["Employee", "Manager", "Admin"],
    },
  },
} as const
