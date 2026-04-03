'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getKLToday, getLeaveYear, countCalendarDays, subtractWorkingDays } from '@/lib/utils/dates'
import { writeAuditLog } from '@/lib/actions/balance'
import type { ActionResult, LeaveRequestWithDetails } from '@/lib/types/app'
import type { Json } from '@/lib/types/database'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LeaveHistoryFilters {
  year?: number
  status?: string
  page?: number
  pageSize?: number
}

export interface LeaveHistoryResult {
  requests: LeaveRequestWithDetails[]
  total: number
  page: number
  pageSize: number
}

// ─── Query ──────────────────────────────────────────────────────────────────

/**
 * Fetch a user's leave request history with optional year/status filters and pagination.
 */
export async function getUserLeaveHistory(
  userId: string,
  filters: LeaveHistoryFilters = {}
): Promise<ActionResult<LeaveHistoryResult>> {
  const supabase = await createClient()
  const { year, status, page = 1, pageSize = 10 } = filters

  let query = supabase
    .from('leave_requests')
    .select(
      `*,
      leave_type:leave_type_configs!leave_requests_leave_type_id_fkey (id, name, allow_half_day, is_paid, requires_attachment, attachment_required_after_days),
      approver:users!leave_requests_approver_id_fkey (id, full_name),
      covering_employee:users!leave_requests_covering_employee_id_fkey (id, full_name)`,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (year) {
    query = query
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`)
  }

  if (status && status !== 'All') {
    query = query.eq('status', status as 'Pending' | 'Approved' | 'Rejected' | 'Cancelled')
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) return { success: false, error: error.message }

  return {
    success: true,
    data: {
      requests: (data ?? []) as LeaveRequestWithDetails[],
      total: count ?? 0,
      page,
      pageSize,
    },
  }
}

// ─── Cancellation ────────────────────────────────────────────────────────────

/**
 * Cancel a Pending leave request.
 * No balance change needed — balance was never deducted for pending requests.
 */
export async function cancelLeaveRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: request, error: fetchError } = await supabase
    .from('leave_requests')
    .select('id, user_id, status, approver_id')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) return { success: false, error: 'Leave request not found.' }
  if (request.user_id !== user.id) return { success: false, error: 'You can only cancel your own requests.' }
  if (request.status !== 'Pending') return { success: false, error: 'Only pending requests can be cancelled.' }

  const beforeState = { ...request } as Json

  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (updateError) return { success: false, error: updateError.message }

  await writeAuditLog(
    user.id,
    'CANCEL_LEAVE',
    'leave_requests',
    requestId,
    beforeState,
    { ...request, status: 'Cancelled' } as Json
  )

  revalidatePath('/leaves')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Cancel an Approved future leave request (within 1 working day window).
 * Restores leave_balances.used. For cross-year requests, restores both years atomically.
 */
export async function cancelApprovedLeave(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: request, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) return { success: false, error: 'Leave request not found.' }
  if (request.user_id !== user.id) return { success: false, error: 'You can only cancel your own requests.' }
  if (request.status !== 'Approved') return { success: false, error: 'Only approved requests can be cancelled this way.' }

  const today = getKLToday()

  // Block cancellation of past or ongoing leave
  if (request.start_date <= today) {
    return { success: false, error: 'Past or ongoing approved leave cannot be cancelled by employees.' }
  }

  // Enforce 1 working day cancellation window
  const cancellationDeadline = subtractWorkingDays(request.start_date, 1)
  if (today > cancellationDeadline) {
    return {
      success: false,
      error: 'Approved leave can only be cancelled at least 1 working day before the start date.',
    }
  }

  const beforeState = { ...request } as Json

  const { error: updateError } = await serviceClient
    .from('leave_requests')
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (updateError) return { success: false, error: updateError.message }

  // Restore balance only for paid leave types
  const { data: leaveTypeConfig } = await supabase
    .from('leave_type_configs')
    .select('is_paid')
    .eq('id', request.leave_type_id)
    .single()

  if (leaveTypeConfig?.is_paid !== false) {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('leave_year_start_month')
      .single()
    const leaveYearStartMonth = settings?.leave_year_start_month ?? 1

    if (request.is_cross_year) {
      // Proportional split by calendar days
      const startYear = getLeaveYear(request.start_date, leaveYearStartMonth)
      const endYear = getLeaveYear(request.end_date, leaveYearStartMonth)

      const yearEndDay = leaveYearStartMonth === 1
        ? `${startYear}-12-31`
        : `${startYear + 1}-${String(leaveYearStartMonth - 1).padStart(2, '0')}-${new Date(startYear + 1, leaveYearStartMonth - 1, 0).getDate()}`

      const totalCal = countCalendarDays(request.start_date, request.end_date)
      const firstYearCal = countCalendarDays(request.start_date, yearEndDay)
      const ratio = firstYearCal / totalCal
      // Round to nearest 0.5 to preserve half-day precision
      const firstYearDays = Math.round(request.duration_days * ratio * 2) / 2
      const secondYearDays = request.duration_days - firstYearDays

      const [{ data: b1 }, { data: b2 }] = await Promise.all([
        serviceClient.from('leave_balances').select('id, used').eq('user_id', request.user_id).eq('leave_type_id', request.leave_type_id).eq('year', startYear).single(),
        serviceClient.from('leave_balances').select('id, used').eq('user_id', request.user_id).eq('leave_type_id', request.leave_type_id).eq('year', endYear).single(),
      ])

      await Promise.all([
        b1 && serviceClient.from('leave_balances').update({ used: Math.max(0, b1.used - firstYearDays) }).eq('id', b1.id),
        b2 && serviceClient.from('leave_balances').update({ used: Math.max(0, b2.used - secondYearDays) }).eq('id', b2.id),
      ])
    } else {
      const leaveYear = getLeaveYear(request.start_date, leaveYearStartMonth)

      const { data: balance } = await serviceClient
        .from('leave_balances')
        .select('id, used')
        .eq('user_id', request.user_id)
        .eq('leave_type_id', request.leave_type_id)
        .eq('year', leaveYear)
        .single()

      if (balance) {
        await serviceClient
          .from('leave_balances')
          .update({ used: Math.max(0, balance.used - (request.duration_days ?? 0)) })
          .eq('id', balance.id)
      }
    }
  }

  await writeAuditLog(
    user.id,
    'CANCEL_APPROVED_LEAVE',
    'leave_requests',
    requestId,
    beforeState,
    { ...request, status: 'Cancelled' } as Json
  )

  revalidatePath('/leaves')
  revalidatePath('/dashboard')
  return { success: true }
}
