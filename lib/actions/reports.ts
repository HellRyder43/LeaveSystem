'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getKLToday } from '@/lib/utils/dates'
import type { ActionResult, UtilizationRow, HeadcountRow, LiabilityRow, TrendDataPoint } from '@/lib/types/app'

// ─── Who Is Out Today ────────────────────────────────────────────────────────

export interface WhoIsOutEntry {
  id: string
  user_id: string
  start_date: string
  end_date: string
  duration_modifier: string
  user: {
    id: string
    full_name: string
    department_id: string | null
    department: { name: string } | null
  } | null
  leave_type: {
    id: string
    name: string
  } | null
}

/**
 * Returns all employees on approved leave today (Asia/KL date).
 * Uses service-role client so all roles can see company-wide data;
 * field-level restriction (leave type visibility) is enforced in the UI layer.
 * Optionally filter to a specific department.
 */
export async function getWhoIsOutToday(
  departmentId?: string | null
): Promise<ActionResult<WhoIsOutEntry[]>> {
  // Auth guard — verify caller is authenticated before using service client
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorised' }

  const supabase = createServiceClient()
  const today = getKLToday()

  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      duration_modifier,
      user:users!leave_requests_user_id_fkey (
        id,
        full_name,
        department_id,
        department:departments!users_department_id_fkey (name)
      ),
      leave_type:leave_type_configs!leave_requests_leave_type_id_fkey (id, name)
    `)
    .eq('status', 'Approved')
    .lte('start_date', today)
    .gte('end_date', today)

  if (error) return { success: false, error: error.message }

  let results = (data ?? []) as unknown as WhoIsOutEntry[]

  if (departmentId) {
    results = results.filter((r) => r.user?.department_id === departmentId)
  }

  return { success: true, data: results }
}

// ─── Leave Utilization Report ─────────────────────────────────────────────────

export async function getLeaveUtilizationReport(
  year: number,
  departmentId?: string,
  leaveTypeId?: string
): Promise<ActionResult<UtilizationRow[]>> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorised' }

  const serviceClient = createServiceClient()

  let query = serviceClient
    .from('leave_balances')
    .select(`
      user_id,
      leave_type_id,
      allocated,
      carried_forward,
      used,
      users!leave_balances_user_id_fkey (full_name, department_id, departments!users_department_id_fkey (name)),
      leave_type_configs!leave_balances_leave_type_id_fkey (name)
    `)
    .eq('year', year)

  if (leaveTypeId) {
    query = query.eq('leave_type_id', leaveTypeId)
  }

  const { data, error } = await query
  if (error) return { success: false, error: error.message }

  type BalanceRow = {
    user_id: string
    leave_type_id: string
    allocated: number
    carried_forward: number
    used: number
    users: { full_name: string; department_id: string | null; departments: { name: string } | null } | null
    leave_type_configs: { name: string } | null
  }

  let rows = (data ?? []) as unknown as BalanceRow[]

  if (departmentId) {
    rows = rows.filter((r) => r.users?.department_id === departmentId)
  }

  const result: UtilizationRow[] = rows.map((r) => ({
    user_id: r.user_id,
    full_name: r.users?.full_name ?? 'Unknown',
    department_name: r.users?.departments?.name ?? 'Unknown',
    leave_type_id: r.leave_type_id,
    leave_type_name: r.leave_type_configs?.name ?? 'Unknown',
    days_allocated: r.allocated + r.carried_forward,
    days_used: r.used,
    days_remaining: r.allocated + r.carried_forward - r.used,
  }))

  return { success: true, data: result }
}

// ─── Headcount On Leave Report ────────────────────────────────────────────────

export async function getHeadcountOnLeaveReport(
  startDate: string,
  endDate: string
): Promise<ActionResult<HeadcountRow[]>> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorised' }

  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('leave_requests')
    .select(`
      id, start_date, end_date, duration_days,
      users!leave_requests_user_id_fkey (full_name),
      leave_type_configs!leave_requests_leave_type_id_fkey (name)
    `)
    .eq('status', 'Approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate)

  if (error) return { success: false, error: error.message }

  type RequestRow = {
    id: string
    start_date: string
    end_date: string
    duration_days: number
    users: { full_name: string } | null
    leave_type_configs: { name: string } | null
  }

  const requests = (data ?? []) as unknown as RequestRow[]

  // Build day-by-day map
  const dayMap: Map<string, { user_id?: string; name: string; leave_type: string; start_date: string; end_date: string; duration_days: number }[]> = new Map()

  // Iterate each date in range
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const onLeave = requests.filter(
      (r) => r.start_date <= dateStr && r.end_date >= dateStr
    )
    if (onLeave.length > 0) {
      dayMap.set(dateStr, onLeave.map((r) => ({
        name: r.users?.full_name ?? 'Unknown',
        leave_type: r.leave_type_configs?.name ?? 'Unknown',
        start_date: r.start_date,
        end_date: r.end_date,
        duration_days: r.duration_days,
      })))
    }
  }

  const result: HeadcountRow[] = Array.from(dayMap.entries()).map(([date, employees]) => ({
    date,
    employees: employees.map((e) => ({
      user_id: '',
      full_name: e.name,
      leave_type_name: e.leave_type,
      start_date: e.start_date,
      end_date: e.end_date,
      duration_days: e.duration_days,
    })),
  }))

  return { success: true, data: result }
}

// ─── Leave Liability Report ───────────────────────────────────────────────────

export async function getLeaveLiabilityReport(
  year: number,
  dailyRateMap: Record<string, number>
): Promise<ActionResult<LiabilityRow[]>> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorised' }

  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('leave_balances')
    .select(`
      user_id, leave_type_id, allocated, carried_forward, used,
      users!leave_balances_user_id_fkey (full_name, department_id, departments!users_department_id_fkey (name)),
      leave_type_configs!leave_balances_leave_type_id_fkey (name, is_paid)
    `)
    .eq('year', year)

  if (error) return { success: false, error: error.message }

  type BalRow = {
    user_id: string
    leave_type_id: string
    allocated: number
    carried_forward: number
    used: number
    users: { full_name: string; department_id: string | null; departments: { name: string } | null } | null
    leave_type_configs: { name: string; is_paid: boolean } | null
  }

  const rows = (data ?? []) as unknown as BalRow[]

  const result: LiabilityRow[] = rows
    .filter((r) => r.leave_type_configs?.is_paid)
    .map((r) => {
      const unused = Math.max(0, r.allocated + r.carried_forward - r.used)
      const rate = dailyRateMap[r.user_id] ?? 0
      return {
        user_id: r.user_id,
        full_name: r.users?.full_name ?? 'Unknown',
        department_name: r.users?.departments?.name ?? 'Unknown',
        leave_type_id: r.leave_type_id,
        leave_type_name: r.leave_type_configs?.name ?? 'Unknown',
        unused_days: unused,
        daily_rate: rate,
        liability: unused * rate,
      }
    })

  return { success: true, data: result }
}

// ─── Monthly Trend ────────────────────────────────────────────────────────────

export async function getLeaveTrend(year: number): Promise<ActionResult<TrendDataPoint[]>> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorised' }

  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('leave_requests')
    .select('created_at')
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)

  if (error) return { success: false, error: error.message }

  const monthCounts: Record<string, number> = {}
  for (let m = 1; m <= 12; m++) {
    monthCounts[`${year}-${String(m).padStart(2, '0')}`] = 0
  }

  for (const row of data ?? []) {
    const month = row.created_at.slice(0, 7)
    if (month in monthCounts) monthCounts[month]++
  }

  const result: TrendDataPoint[] = Object.entries(monthCounts).map(([month, count]) => ({
    month,
    count,
  }))

  return { success: true, data: result }
}

// ─── Payroll CSV Export ────────────────────────────────────────────────────────

export async function exportPayrollCSV(
  month: number,
  year: number
): Promise<ActionResult<{ csvContent: string }>> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorised' }

  const serviceClient = createServiceClient()
  const monthStr = String(month).padStart(2, '0')
  const startDate = `${year}-${monthStr}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${monthStr}-${lastDay}`

  const { data, error } = await serviceClient
    .from('leave_requests')
    .select(`
      id, start_date, end_date, duration_days, duration_modifier, status,
      users!leave_requests_user_id_fkey (full_name, email),
      leave_type_configs!leave_requests_leave_type_id_fkey (name)
    `)
    .eq('status', 'Approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('start_date')

  if (error) return { success: false, error: error.message }

  type PayrollRow = {
    id: string
    start_date: string
    end_date: string
    duration_days: number
    duration_modifier: string
    status: string
    users: { full_name: string; email: string } | null
    leave_type_configs: { name: string } | null
  }

  const rows = (data ?? []) as unknown as PayrollRow[]

  const header = 'Employee Name,Email,Leave Type,Start Date,End Date,Duration (Days),Duration Modifier'
  const csvLines = rows.map((r) =>
    [
      `"${r.users?.full_name ?? ''}"`,
      `"${r.users?.email ?? ''}"`,
      `"${r.leave_type_configs?.name ?? ''}"`,
      r.start_date,
      r.end_date,
      r.duration_days,
      `"${r.duration_modifier}"`,
    ].join(',')
  )

  const csvContent = [header, ...csvLines].join('\n')
  return { success: true, data: { csvContent } }
}
