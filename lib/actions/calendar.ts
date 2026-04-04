'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types/app'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CalendarLeaveEntry {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: string            // 'Approved' | 'Pending'
  duration_modifier: string
  user: {
    id: string
    full_name: string
    department_id: string | null
  } | null
  leave_type: {
    id: string
    name: string
  } | null
}

export interface CalendarHoliday {
  id: string
  date: string
  name: string
}

export interface CalendarData {
  leaves: CalendarLeaveEntry[]
  holidays: CalendarHoliday[]
}

export interface Department {
  id: string
  name: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthBounds(year: number, month: number): { firstDay: string; lastDay: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDayNum = new Date(year, month, 0).getDate() // day 0 of next month = last day of this month
  return {
    firstDay: `${year}-${pad(month)}-01`,
    lastDay: `${year}-${pad(month)}-${pad(lastDayNum)}`,
  }
}

// ─── Main action ─────────────────────────────────────────────────────────────

/**
 * Fetch leave requests and public holidays for a given month.
 *
 * Uses the service-role client to bypass RLS so that all roles (including
 * Employees) can see their full department calendar. Application-layer
 * filtering limits what each role can see:
 *   - Employee / Manager: only their own department
 *   - Admin: all departments, or filtered by `departmentId`
 *
 * Role-based info stripping (leave type) is done by the calling component.
 */
export async function getTeamCalendarData(
  year: number,
  month: number,           // 1-based
  departmentId?: string | null,
): Promise<ActionResult<CalendarData>> {
  // Verify caller is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthenticated' }

  const service = createServiceClient()
  const { firstDay, lastDay } = monthBounds(year, month)

  // ── Leave requests ────────────────────────────────────────────────────────
  // Fetch all Approved + Pending leaves whose date range overlaps this month.
  // start_date <= lastDay AND end_date >= firstDay
  const { data: leaveData, error: leaveError } = await service
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      status,
      duration_modifier,
      user:users!leave_requests_user_id_fkey (id, full_name, department_id),
      leave_type:leave_type_configs!leave_requests_leave_type_id_fkey (id, name)
    `)
    .in('status', ['Approved', 'Pending'])
    .lte('start_date', lastDay)
    .gte('end_date', firstDay)

  if (leaveError) return { success: false, error: leaveError.message }

  type RawLeave = Omit<CalendarLeaveEntry, 'user'> & {
    user: { id: string; full_name: string; department_id: string | null } | null
  }

  let leaves = (leaveData ?? []) as unknown as RawLeave[]

  // Filter to requested department when specified
  if (departmentId) {
    leaves = leaves.filter((l) => l.user?.department_id === departmentId)
  }

  // ── Public holidays ───────────────────────────────────────────────────────
  let holidayQuery = service
    .from('public_holidays')
    .select('id, date, name')
    .gte('date', firstDay)
    .lte('date', lastDay)

  if (departmentId) {
    holidayQuery = holidayQuery.or(
      `department_id.is.null,department_id.eq.${departmentId}`
    )
  } else {
    holidayQuery = holidayQuery.is('department_id', null)
  }

  const { data: holidayData, error: holidayError } = await holidayQuery
  if (holidayError) return { success: false, error: holidayError.message }

  return {
    success: true,
    data: {
      leaves: leaves as CalendarLeaveEntry[],
      holidays: (holidayData ?? []) as CalendarHoliday[],
    },
  }
}

// ─── Departments list (for Admin filter) ─────────────────────────────────────

/**
 * Fetch all active departments, sorted by name.
 * Only used server-side by the calendar page to populate the Admin filter.
 */
export async function getDepartments(): Promise<ActionResult<Department[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('departments')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []) as Department[] }
}
