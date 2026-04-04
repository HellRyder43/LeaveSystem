'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getKLToday, getLeaveYear, countCalendarDays, subtractWorkingDays } from '@/lib/utils/dates'
import { getWorkingDaysBetween } from '@/lib/utils/working-days'
import { resolveApprover } from '@/lib/utils/routing'
import { sendNotification } from '@/lib/actions/notifications'
import { writeAuditLog } from '@/lib/actions/balance'
import type { ActionResult, LeaveRequestWithDetails, DurationModifier } from '@/lib/types/app'
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

// ─── Leave Year Helpers ────────────────────────────────────────────────────────

function getLeaveYearStartDate(year: number, leaveYearStartMonth: number): string {
  if (leaveYearStartMonth === 1) return `${year}-01-01`
  return `${year}-${String(leaveYearStartMonth).padStart(2, '0')}-01`
}

function getLeaveYearEndDate(year: number, leaveYearStartMonth: number): string {
  if (leaveYearStartMonth === 1) return `${year}-12-31`
  const endMonth = leaveYearStartMonth - 1
  const calYear = year + 1
  const lastDay = new Date(calYear, endMonth, 0).getDate()
  return `${calYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

/**
 * Get effective balance for a user/leave type/year, accounting for pending_in_flight.
 */
async function getEffectiveBalance(
  userId: string,
  leaveTypeId: string,
  year: number,
  leaveYearStartMonth: number
): Promise<number> {
  const supabase = await createClient()

  const yearStart = getLeaveYearStartDate(year, leaveYearStartMonth)
  const yearEnd   = getLeaveYearEndDate(year, leaveYearStartMonth)

  const [{ data: balance }, { data: pending }] = await Promise.all([
    supabase
      .from('leave_balances')
      .select('allocated, used, carried_forward')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', year)
      .single(),
    supabase
      .from('leave_requests')
      .select('duration_days')
      .eq('user_id', userId)
      .eq('leave_type_id', leaveTypeId)
      .eq('status', 'Pending')
      .gte('start_date', yearStart)
      .lte('start_date', yearEnd),
  ])

  if (!balance) return 0
  const pendingInFlight = (pending ?? []).reduce((sum, r) => sum + (r.duration_days ?? 0), 0)
  return balance.allocated + balance.carried_forward - balance.used - pendingInFlight
}

// ─── Apply For Leave ──────────────────────────────────────────────────────────

/**
 * Submit a new leave request.
 * Validation pipeline: leave type → is_paid → balance → backdated window →
 * MC requirement → upload → resolve approver → insert → notify → audit log.
 */
export async function applyForLeave(
  formData: FormData
): Promise<ActionResult<{ requestId: string }>> {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  // ── Parse FormData ──────────────────────────────────────────────
  const leaveTypeId        = formData.get('leave_type_id') as string
  const startDate          = formData.get('start_date') as string
  const endDate            = formData.get('end_date') as string
  const durationModifier   = formData.get('duration_modifier') as DurationModifier
  const reason             = (formData.get('reason') as string | null)?.trim() || null
  const coveringEmployeeId = (formData.get('covering_employee_id') as string | null) || null
  const attachmentFile     = formData.get('attachment') as File | null

  if (!leaveTypeId || !startDate || !endDate || !durationModifier) {
    return { success: false, error: 'Missing required fields.' }
  }
  if (startDate > endDate) {
    return { success: false, error: 'End date must be on or after start date.' }
  }

  // ── Fetch leave type config ─────────────────────────────────────
  const { data: leaveType, error: ltError } = await supabase
    .from('leave_type_configs')
    .select('*')
    .eq('id', leaveTypeId)
    .eq('is_active', true)
    .single()

  if (ltError || !leaveType) {
    return { success: false, error: 'Invalid or inactive leave type.' }
  }

  // ── Fetch user data ─────────────────────────────────────────────
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('department_id, role, is_active, join_date')
    .eq('id', user.id)
    .single()

  if (userError || !userData) return { success: false, error: 'User not found.' }
  if (!userData.is_active) return { success: false, error: 'Account is inactive.' }

  // ── Fetch system settings ───────────────────────────────────────
  const { data: settings } = await supabase
    .from('system_settings')
    .select('leave_year_start_month, backdated_leave_window_days')
    .single()

  const leaveYearStartMonth = settings?.leave_year_start_month   ?? 1
  const backdatedWindowDays = settings?.backdated_leave_window_days ?? 7

  // ── Backdated window check (calendar days, KL timezone) ─────────
  const today = getKLToday()
  const earliestMs = new Date(`${today}T00:00:00Z`).getTime() - backdatedWindowDays * 86400000
  const earliestAllowed = new Date(earliestMs).toISOString().slice(0, 10)

  if (startDate < earliestAllowed) {
    return {
      success: false,
      error: `Leave cannot be applied more than ${backdatedWindowDays} days in the past.`,
    }
  }

  const isBackdated = startDate < today

  // ── Half-day validation ─────────────────────────────────────────
  const isHalfDay = durationModifier === 'First Half' || durationModifier === 'Second Half'

  if (isHalfDay) {
    if (!leaveType.allow_half_day) {
      return { success: false, error: `${leaveType.name} does not support half-day leave.` }
    }
    if (startDate !== endDate) {
      return { success: false, error: 'Half-day leave can only be applied for a single day.' }
    }
    // Only one half-day per calendar day
    const { data: existing } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('start_date', startDate)
      .in('duration_modifier', ['First Half', 'Second Half'])
      .in('status', ['Pending', 'Approved'])
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: 'You already have a half-day request for this date.' }
    }
  }

  // ── Calculate duration ──────────────────────────────────────────
  let durationDays: number

  if (isHalfDay) {
    durationDays = 0.5
  } else {
    const { workingDays } = await getWorkingDaysBetween(startDate, endDate, userData.department_id)
    durationDays = workingDays
    if (durationDays === 0) {
      return { success: false, error: 'The selected date range contains no working days.' }
    }
  }

  // ── Backdated annual leave requires reason ──────────────────────
  if (isBackdated && leaveType.name.toLowerCase().includes('annual') && !reason) {
    return { success: false, error: 'A reason is required for backdated annual leave.' }
  }

  // ── MC (attachment) requirement ─────────────────────────────────
  const attachmentRequiredAfter = leaveType.attachment_required_after_days ?? 1
  const requiresAttachment = leaveType.requires_attachment && durationDays > attachmentRequiredAfter
  const hasFile = !!(attachmentFile && attachmentFile.size > 0)

  if (requiresAttachment && !hasFile) {
    return {
      success: false,
      error: `A medical certificate is required for ${leaveType.name.toLowerCase()} leave exceeding ${attachmentRequiredAfter} day${attachmentRequiredAfter === 1 ? '' : 's'}.`,
    }
  }

  // ── Cross-year detection ────────────────────────────────────────
  const startYear = getLeaveYear(startDate, leaveYearStartMonth)
  const endYear   = getLeaveYear(endDate,   leaveYearStartMonth)
  const isCrossYear = startYear !== endYear

  // ── Balance check (skip for unpaid leave) ──────────────────────
  if (leaveType.is_paid) {
    if (isCrossYear) {
      const yearEndDate   = getLeaveYearEndDate(startYear, leaveYearStartMonth)
      const yearStartDate = getLeaveYearStartDate(endYear, leaveYearStartMonth)

      const [{ workingDays: firstYearDays }, { workingDays: secondYearDays }] = await Promise.all([
        getWorkingDaysBetween(startDate, yearEndDate, userData.department_id),
        getWorkingDaysBetween(yearStartDate, endDate, userData.department_id),
      ])

      const [firstEffective, secondEffective] = await Promise.all([
        getEffectiveBalance(user.id, leaveTypeId, startYear, leaveYearStartMonth),
        getEffectiveBalance(user.id, leaveTypeId, endYear, leaveYearStartMonth),
      ])

      if (firstEffective < firstYearDays) {
        return {
          success: false,
          error: `Insufficient balance in ${startYear}. You have ${firstEffective} days remaining but need ${firstYearDays}.`,
        }
      }
      if (secondEffective < secondYearDays) {
        return {
          success: false,
          error: `Insufficient balance in ${endYear}. You have ${secondEffective} days remaining but need ${secondYearDays}.`,
        }
      }
    } else {
      const effectiveBalance = await getEffectiveBalance(user.id, leaveTypeId, startYear, leaveYearStartMonth)
      if (effectiveBalance < durationDays) {
        return {
          success: false,
          error: `Insufficient balance. You have ${effectiveBalance} day${effectiveBalance === 1 ? '' : 's'} remaining. This request requires ${durationDays} day${durationDays === 1 ? '' : 's'}.`,
        }
      }
    }
  }

  // ── Upload attachment ───────────────────────────────────────────
  let attachmentUrl: string | null = null
  if (hasFile && attachmentFile) {
    const ext = attachmentFile.name.split('.').pop() ?? 'bin'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical-certificates')
      .upload(path, attachmentFile)

    if (uploadError) {
      return { success: false, error: 'Failed to upload attachment. Please try again.' }
    }
    attachmentUrl = uploadData.path
  }

  // ── Resolve approver ────────────────────────────────────────────
  const approverId = await resolveApprover(user.id)
  if (!approverId) {
    return { success: false, error: 'No approver found. Please contact an administrator.' }
  }

  // ── Insert leave request ────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: newRequest, error: insertError } = await serviceClient
    .from('leave_requests')
    .insert({
      user_id:              user.id,
      leave_type_id:        leaveTypeId,
      start_date:           startDate,
      end_date:             endDate,
      duration_days:        durationDays,
      duration_modifier:    durationModifier,
      reason:               reason,
      status:               'Pending',
      approver_id:          approverId,
      attachment_url:       attachmentUrl,
      covering_employee_id: coveringEmployeeId,
      is_backdated:         isBackdated,
      is_cross_year:        isCrossYear,
      created_at:           now,
      updated_at:           now,
    })
    .select()
    .single()

  if (insertError || !newRequest) {
    return { success: false, error: insertError?.message ?? 'Failed to submit leave request.' }
  }

  // ── Notifications (non-blocking) ────────────────────────────────
  void sendNotification(approverId, 'LeaveSubmitted', newRequest.id).catch(() => {})
  if (approverId !== user.id) {
    void sendNotification(user.id, 'LeaveSubmitted', newRequest.id).catch(() => {})
  }

  // ── Audit log ───────────────────────────────────────────────────
  await writeAuditLog(
    user.id,
    'SUBMIT_LEAVE',
    'leave_requests',
    newRequest.id,
    {} as Json,
    newRequest as Json
  )

  revalidatePath('/leaves')
  revalidatePath('/dashboard')
  return { success: true, data: { requestId: newRequest.id } }
}

// ─── Team Conflict Query ──────────────────────────────────────────────────────

export interface TeamConflict {
  user_id: string
  full_name: string
  start_date: string
  end_date: string
}

/**
 * Fetch approved leaves in the same department that overlap with the given date range.
 * Used for the team conflict warning on the leave application form.
 */
export async function getTeamConflictsForDates(
  departmentId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<TeamConflict[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: colleagues } = await supabase
    .from('users')
    .select('id')
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .neq('id', user.id)

  if (!colleagues || colleagues.length === 0) {
    return { success: true, data: [] }
  }

  const colleagueIds = colleagues.map((c) => c.id)

  const { data: conflicts, error } = await supabase
    .from('leave_requests')
    .select(`
      user_id,
      start_date,
      end_date,
      requester:users!leave_requests_user_id_fkey (full_name)
    `)
    .eq('status', 'Approved')
    .in('user_id', colleagueIds)
    .lte('start_date', endDate)
    .gte('end_date', startDate)

  if (error) return { success: false, error: error.message }

  const result: TeamConflict[] = (conflicts ?? []).map((c) => ({
    user_id: c.user_id,
    full_name: (c.requester as { full_name: string } | null)?.full_name ?? 'Unknown',
    start_date: c.start_date,
    end_date: c.end_date,
  }))

  return { success: true, data: result }
}

// ─── Covering Employee Conflict Query ─────────────────────────────────────────

export interface CoveringConflict {
  full_name: string
  start_date: string
  end_date: string
}

/**
 * Check if a covering employee has approved leave overlapping the given dates.
 */
export async function getCoveringEmployeeConflict(
  coveringEmployeeId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<CoveringConflict | null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: conflicts, error } = await supabase
    .from('leave_requests')
    .select(`
      start_date,
      end_date,
      requester:users!leave_requests_user_id_fkey (full_name)
    `)
    .eq('user_id', coveringEmployeeId)
    .eq('status', 'Approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .limit(1)

  if (error) return { success: false, error: error.message }
  if (!conflicts || conflicts.length === 0) return { success: true, data: null }

  const c = conflicts[0]
  return {
    success: true,
    data: {
      full_name: (c.requester as { full_name: string } | null)?.full_name ?? 'Unknown',
      start_date: c.start_date,
      end_date: c.end_date,
    },
  }
}
