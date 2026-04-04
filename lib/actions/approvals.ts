'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getKLToday, getLeaveYear } from '@/lib/utils/dates'
import { getWorkingDaysBetween, workingDaysSince } from '@/lib/utils/working-days'
import { writeAuditLog } from '@/lib/actions/balance'
import { sendNotification } from '@/lib/actions/notifications'
import type { ActionResult, UserRole } from '@/lib/types/app'
import type { Json } from '@/lib/types/database'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OverlapEntry {
  user_full_name: string
  start_date: string
  end_date: string
}

export interface PendingApprovalRequest {
  id: string
  user_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  duration_days: number | null
  duration_modifier: string
  reason: string | null
  status: string
  approver_id: string | null
  approver_comment: string | null
  attachment_url: string | null
  is_backdated: boolean | null
  is_cross_year: boolean | null
  escalated_at: string | null
  created_at: string
  updated_at: string
  /** Working days since submission (for SLA display) */
  sla_days_elapsed: number
  user: {
    id: string
    full_name: string
    role: string
    department_id: string | null
  } | null
  leave_type: {
    id: string
    name: string
  } | null
  /** Other approved/pending leaves in the same dept that overlap this request */
  overlapping_leaves: OverlapEntry[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function leaveYearStartDate(year: number, startMonth: number): string {
  if (startMonth === 1) return `${year}-01-01`
  return `${year}-${String(startMonth).padStart(2, '0')}-01`
}

function leaveYearEndDate(year: number, startMonth: number): string {
  if (startMonth === 1) return `${year}-12-31`
  const endMonth = startMonth - 1
  const calYear = year + 1
  const lastDay = new Date(calYear, endMonth, 0).getDate()
  return `${calYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// ─── Queue fetch ──────────────────────────────────────────────────────────────

/**
 * Fetch all pending requests visible to the caller:
 *   - Manager: requests where approver_id = caller's ID
 *   - Admin: all pending requests across the company
 * Also computes SLA elapsed days and overlapping dept leaves per request.
 */
export async function getPendingApprovals(
  userId: string,
  userRole: UserRole
): Promise<ActionResult<{ requests: PendingApprovalRequest[]; slaLimitDays: number }>> {
  const supabase = await createClient()
  const service = createServiceClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return { success: false, error: 'Not authenticated.' }

  // Fetch SLA limit
  const { data: settings } = await supabase
    .from('system_settings')
    .select('approval_sla_days')
    .single()
  const slaLimitDays = settings?.approval_sla_days ?? 5

  // Build query
  let query = service
    .from('leave_requests')
    .select(`
      id, user_id, leave_type_id, start_date, end_date, duration_days,
      duration_modifier, reason, status, approver_id, approver_comment,
      attachment_url, is_backdated, is_cross_year, escalated_at,
      created_at, updated_at,
      user:users!leave_requests_user_id_fkey (id, full_name, role, department_id),
      leave_type:leave_type_configs!leave_requests_leave_type_id_fkey (id, name)
    `)
    .eq('status', 'Pending')
    .order('created_at', { ascending: true })

  if (userRole === 'Manager') {
    query = query.eq('approver_id', userId)
  }
  // Admin sees all pending requests (no filter)

  const { data, error } = await query
  if (error) return { success: false, error: error.message }

  const rawRequests = (data ?? []) as unknown as PendingApprovalRequest[]

  // Collect all department IDs to batch-fetch overlapping leaves
  const deptIds = [
    ...new Set(
      rawRequests
        .map((r) => (r.user as { department_id: string | null } | null)?.department_id)
        .filter((id): id is string => !!id)
    ),
  ]

  // Fetch currently approved leaves for all relevant departments (for overlap display)
  const today = getKLToday()
  let overlapMap: Map<string, OverlapEntry[]> = new Map() // requestId → overlaps

  if (deptIds.length > 0) {
    const { data: deptUsers } = await service
      .from('users')
      .select('id, full_name, department_id')
      .in('department_id', deptIds)
      .eq('is_active', true)

    const deptUserMap = new Map<string, { id: string; full_name: string; department_id: string }[]>()
    for (const u of deptUsers ?? []) {
      if (!u.department_id) continue
      if (!deptUserMap.has(u.department_id)) deptUserMap.set(u.department_id, [])
      deptUserMap.get(u.department_id)!.push(u as { id: string; full_name: string; department_id: string })
    }

    // For each pending request, find approved leaves from same dept colleagues that overlap
    for (const req of rawRequests) {
      const deptId = (req.user as { department_id: string | null } | null)?.department_id
      if (!deptId) { overlapMap.set(req.id, []); continue }

      const colleagues = (deptUserMap.get(deptId) ?? []).filter((u) => u.id !== req.user_id)
      const colleagueIds = colleagues.map((c) => c.id)

      if (colleagueIds.length === 0) { overlapMap.set(req.id, []); continue }

      const { data: overlaps } = await service
        .from('leave_requests')
        .select('user_id, start_date, end_date')
        .in('user_id', colleagueIds)
        .eq('status', 'Approved')
        .lte('start_date', req.end_date)
        .gte('end_date', req.start_date)
        .limit(5)

      const entries: OverlapEntry[] = (overlaps ?? []).map((o) => ({
        user_full_name: colleagues.find((c) => c.id === o.user_id)?.full_name ?? 'Unknown',
        start_date: o.start_date,
        end_date: o.end_date,
      }))
      overlapMap.set(req.id, entries)
    }
  }

  // Attach SLA elapsed and overlapping leaves
  const enriched: PendingApprovalRequest[] = rawRequests.map((req) => ({
    ...req,
    sla_days_elapsed: workingDaysSince(req.created_at),
    overlapping_leaves: overlapMap.get(req.id) ?? [],
  }))

  return { success: true, data: { requests: enriched, slaLimitDays } }
}

// ─── Approve ──────────────────────────────────────────────────────────────────

/**
 * Approve a pending leave request.
 * Deducts leave_balances.used for paid leave (cross-year aware).
 * Notifies employee and writes audit log.
 */
export async function approveLeaveRequest(
  requestId: string,
  comment?: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  // Fetch the request + leave type
  const { data: request, error: fetchError } = await service
    .from('leave_requests')
    .select(`
      *,
      leave_type:leave_type_configs!leave_requests_leave_type_id_fkey (is_paid, name)
    `)
    .eq('id', requestId)
    .single()

  if (fetchError || !request) return { success: false, error: 'Leave request not found.' }
  if (request.status !== 'Pending') return { success: false, error: 'Only pending requests can be approved.' }

  // Auth check: must be the assigned approver or Admin
  const { data: actorProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = actorProfile?.role === 'Admin'
  if (!isAdmin && request.approver_id !== user.id) {
    return { success: false, error: 'You are not authorised to approve this request.' }
  }

  const beforeState = { ...request } as Json
  const now = new Date().toISOString()

  // Update leave request status
  const { error: updateError } = await service
    .from('leave_requests')
    .update({
      status: 'Approved',
      approver_id: user.id,
      approver_comment: comment?.trim() || null,
      updated_at: now,
    })
    .eq('id', requestId)

  if (updateError) return { success: false, error: updateError.message }

  // ── Balance deduction (paid leave only) ───────────────────────────
  const leaveType = request.leave_type as { is_paid: boolean } | null
  if (leaveType?.is_paid !== false) {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('leave_year_start_month')
      .single()
    const startMonth = settings?.leave_year_start_month ?? 1

    if (request.is_cross_year) {
      const sYear = getLeaveYear(request.start_date, startMonth)
      const eYear = getLeaveYear(request.end_date, startMonth)
      const yearEnd   = leaveYearEndDate(sYear, startMonth)
      const yearStart = leaveYearStartDate(eYear, startMonth)

      const { data: empData } = await service
        .from('users')
        .select('department_id')
        .eq('id', request.user_id)
        .single()
      const deptId = empData?.department_id ?? undefined

      const [{ workingDays: days1 }, { workingDays: days2 }] = await Promise.all([
        getWorkingDaysBetween(request.start_date, yearEnd, deptId),
        getWorkingDaysBetween(yearStart, request.end_date, deptId),
      ])

      const [{ data: b1 }, { data: b2 }] = await Promise.all([
        service.from('leave_balances').select('id, used').eq('user_id', request.user_id).eq('leave_type_id', request.leave_type_id).eq('year', sYear).single(),
        service.from('leave_balances').select('id, used').eq('user_id', request.user_id).eq('leave_type_id', request.leave_type_id).eq('year', eYear).single(),
      ])

      await Promise.all([
        b1 ? service.from('leave_balances').update({ used: b1.used + days1 }).eq('id', b1.id) : Promise.resolve(),
        b2 ? service.from('leave_balances').update({ used: b2.used + days2 }).eq('id', b2.id) : Promise.resolve(),
      ])
    } else {
      const leaveYear = getLeaveYear(request.start_date, startMonth)
      const { data: balance } = await service
        .from('leave_balances')
        .select('id, used')
        .eq('user_id', request.user_id)
        .eq('leave_type_id', request.leave_type_id)
        .eq('year', leaveYear)
        .single()

      if (balance) {
        await service
          .from('leave_balances')
          .update({ used: balance.used + (request.duration_days ?? 0) })
          .eq('id', balance.id)
      }
    }
  }

  // Non-blocking notification + audit log
  void sendNotification(request.user_id, 'LeaveApproved', requestId).catch(() => {})

  await writeAuditLog(
    user.id, 'APPROVE_LEAVE', 'leave_requests', requestId,
    beforeState,
    { ...request, status: 'Approved', approver_id: user.id } as Json
  )

  revalidatePath('/manager/approvals')
  revalidatePath('/dashboard')
  revalidatePath('/leaves')
  return { success: true }
}

// ─── Reject ───────────────────────────────────────────────────────────────────

/**
 * Reject a pending leave request with a mandatory approver comment.
 * No balance change needed (balance was never deducted for pending requests).
 */
export async function rejectLeaveRequest(
  requestId: string,
  comment: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  if (!comment?.trim()) {
    return { success: false, error: 'A comment is required when rejecting a leave request.' }
  }

  const { data: request, error: fetchError } = await service
    .from('leave_requests')
    .select('id, user_id, status, approver_id')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) return { success: false, error: 'Leave request not found.' }
  if (request.status !== 'Pending') return { success: false, error: 'Only pending requests can be rejected.' }

  // Auth check
  const { data: actorProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = actorProfile?.role === 'Admin'
  if (!isAdmin && request.approver_id !== user.id) {
    return { success: false, error: 'You are not authorised to reject this request.' }
  }

  const beforeState = { ...request } as Json
  const now = new Date().toISOString()

  const { error: updateError } = await service
    .from('leave_requests')
    .update({
      status: 'Rejected',
      approver_id: user.id,
      approver_comment: comment.trim(),
      updated_at: now,
    })
    .eq('id', requestId)

  if (updateError) return { success: false, error: updateError.message }

  void sendNotification(request.user_id, 'LeaveRejected', requestId).catch(() => {})

  await writeAuditLog(
    user.id, 'REJECT_LEAVE', 'leave_requests', requestId,
    beforeState,
    { ...request, status: 'Rejected', approver_comment: comment.trim() } as Json
  )

  revalidatePath('/manager/approvals')
  revalidatePath('/dashboard')
  revalidatePath('/leaves')
  return { success: true }
}

// ─── Bulk Approve ─────────────────────────────────────────────────────────────

/**
 * Approve multiple pending requests in sequence.
 * Returns per-request success/failure so the UI can surface partial failures.
 */
export async function bulkApproveLeaveRequests(
  requestIds: string[]
): Promise<ActionResult<{ approved: string[]; failed: { id: string; error: string }[] }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  if (!requestIds.length) return { success: false, error: 'No requests selected.' }

  const approved: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const id of requestIds) {
    const result = await approveLeaveRequest(id)
    if (result.success) {
      approved.push(id)
    } else {
      failed.push({ id, error: result.error ?? 'Unknown error' })
    }
  }

  revalidatePath('/manager/approvals')
  return {
    success: true,
    data: { approved, failed },
  }
}

// ─── Escalate ─────────────────────────────────────────────────────────────────

/**
 * Escalate a pending request to Admin (Admin-only action).
 * Sets escalated_at and notifies Admin.
 */
export async function escalateLeaveRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: actorProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (actorProfile?.role !== 'Admin') {
    return { success: false, error: 'Only Admins can escalate leave requests.' }
  }

  const { data: request, error: fetchError } = await service
    .from('leave_requests')
    .select('id, user_id, status, approver_id, escalated_at')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) return { success: false, error: 'Leave request not found.' }
  if (request.status !== 'Pending') return { success: false, error: 'Only pending requests can be escalated.' }
  if (request.escalated_at) return { success: false, error: 'This request has already been escalated.' }

  const now = new Date().toISOString()
  const beforeState = { ...request } as Json

  const { error: updateError } = await service
    .from('leave_requests')
    .update({ escalated_at: now, updated_at: now })
    .eq('id', requestId)

  if (updateError) return { success: false, error: updateError.message }

  // Notify the Admin (self-notification) and the original approver
  void sendNotification(user.id, 'EscalationAlert', requestId).catch(() => {})
  if (request.approver_id && request.approver_id !== user.id) {
    void sendNotification(request.approver_id, 'EscalationAlert', requestId).catch(() => {})
  }

  await writeAuditLog(
    user.id, 'ESCALATE_LEAVE', 'leave_requests', requestId,
    beforeState,
    { ...request, escalated_at: now } as Json
  )

  revalidatePath('/manager/approvals')
  return { success: true }
}

// ─── Attachment signed URL ────────────────────────────────────────────────────

/**
 * Generate a short-lived signed URL for a medical certificate.
 * Caller must be the assigned approver or Admin.
 */
export async function getAttachmentSignedUrl(
  requestId: string
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: request } = await service
    .from('leave_requests')
    .select('attachment_url, approver_id')
    .eq('id', requestId)
    .single()

  if (!request?.attachment_url) return { success: false, error: 'No attachment found.' }

  const { data: actorProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = actorProfile?.role === 'Admin'
  if (!isAdmin && request.approver_id !== user.id) {
    return { success: false, error: 'Not authorised to view this attachment.' }
  }

  const { data, error } = await service.storage
    .from('medical-certificates')
    .createSignedUrl(request.attachment_url, 300) // 5-minute expiry

  if (error || !data?.signedUrl) return { success: false, error: 'Failed to generate download link.' }

  return { success: true, data: { url: data.signedUrl } }
}
