import type { Database } from './database'

// ── Enum re-exports ──────────────────────────────────────────────
export type UserRole          = Database['public']['Enums']['user_role']
export type LeaveStatus       = Database['public']['Enums']['leave_status']
export type DurationModifier  = Database['public']['Enums']['duration_modifier_enum']
export type GenderRestriction = Database['public']['Enums']['gender_restriction_enum']
export type NotificationType  = Database['public']['Enums']['notification_type_enum']
export type EncashmentTrigger = Database['public']['Enums']['encashment_trigger_enum']

// ── Table row types ──────────────────────────────────────────────
export type User               = Database['public']['Tables']['users']['Row']
export type Department         = Database['public']['Tables']['departments']['Row']
export type LeaveTypeConfig    = Database['public']['Tables']['leave_type_configs']['Row']
export type LeaveBalance       = Database['public']['Tables']['leave_balances']['Row']
export type LeaveRequest       = Database['public']['Tables']['leave_requests']['Row']
export type Notification       = Database['public']['Tables']['notifications']['Row']
export type AuditLog           = Database['public']['Tables']['audit_log']['Row']
export type PublicHoliday      = Database['public']['Tables']['public_holidays']['Row']
export type SystemSettings     = Database['public']['Tables']['system_settings']['Row']
export type LeaveEncashmentLog = Database['public']['Tables']['leave_encashment_log']['Row']

// ── Session context ──────────────────────────────────────────────
export interface SessionUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id: string | null
  is_active: boolean
  join_date: string
}

// ── Enriched/computed types ──────────────────────────────────────

/** Balance row extended with pending_in_flight and effective_balance */
export interface EffectiveLeaveBalance extends LeaveBalance {
  pending_in_flight: number
  /** allocated + carried_forward - used - pending_in_flight */
  effective_balance: number
  leave_type: Pick<LeaveTypeConfig, 'id' | 'name' | 'allow_half_day' | 'is_carry_forward_allowed' | 'max_carry_forward_days'>
}

/** Leave request enriched with joined user, leave type, and approver */
export interface LeaveRequestWithDetails extends LeaveRequest {
  user?: Pick<User, 'id' | 'full_name' | 'email' | 'department_id' | 'role'>
  leave_type?: Pick<LeaveTypeConfig, 'id' | 'name' | 'allow_half_day' | 'is_paid' | 'requires_attachment' | 'attachment_required_after_days'>
  approver?: Pick<User, 'id' | 'full_name'>
  covering_employee?: Pick<User, 'id' | 'full_name'>
}

// ── Form data types ──────────────────────────────────────────────

export interface LeaveRequestFormData {
  leave_type_id: string
  start_date: string        // ISO date string YYYY-MM-DD
  end_date: string          // ISO date string YYYY-MM-DD
  duration_modifier: DurationModifier
  reason?: string
  covering_employee_id?: string
  notes?: string
  attachment?: File
}

export interface NewEmployeeFormData {
  full_name: string
  email: string
  department_id: string
  role: UserRole
  join_date: string         // ISO date string YYYY-MM-DD
}

export interface LeaveTypeFormData {
  name: string
  default_quota: number
  allow_half_day: boolean
  is_carry_forward_allowed: boolean
  max_carry_forward_days: number
  requires_attachment: boolean
  attachment_required_after_days: number
  gender_restriction: GenderRestriction
  is_paid: boolean
  is_active: boolean
}

export interface HolidayFormData {
  name: string
  date: string              // ISO date string YYYY-MM-DD
  department_id?: string    // undefined = global
}

export interface SettingsFormData {
  approval_sla_days: number
  backdated_leave_window_days: number
  carry_forward_expiry_month: number
  encashment_enabled: boolean
  leave_year_start_month: number
  entitlement_tier_lt2: number
  entitlement_tier_2to5: number
  entitlement_tier_gt5: number
}

// ── Server action response shape ─────────────────────────────────
export interface ActionResult<T = unknown> {
  success: boolean
  error?: string
  data?: T
}

// ── Report filter types ──────────────────────────────────────────
export interface ReportFilters {
  year?: number
  department_id?: string
  leave_type_id?: string
  user_id?: string
}

// ── Admin report row types ────────────────────────────────────────
export interface UtilizationRow {
  user_id: string
  full_name: string
  department_name: string
  leave_type_id: string
  leave_type_name: string
  days_allocated: number
  days_used: number
  days_remaining: number
}

export interface HeadcountEntry {
  user_id: string
  full_name: string
  leave_type_name: string
  start_date: string
  end_date: string
  duration_days: number
}

export interface HeadcountRow {
  date: string
  employees: HeadcountEntry[]
}

export interface LiabilityRow {
  user_id: string
  full_name: string
  department_name: string
  leave_type_id: string
  leave_type_name: string
  unused_days: number
  daily_rate: number
  liability: number
}

export interface TrendDataPoint {
  month: string
  count: number
}

// ── Audit log types ───────────────────────────────────────────────
export interface AuditLogEntry extends AuditLog {
  actor_name: string | null
}

export interface AuditLogFilters {
  actor_id?: string
  action_type?: string
  from_date?: string
  to_date?: string
}
