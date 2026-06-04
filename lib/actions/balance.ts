'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getKLToday, getLeaveYear } from '@/lib/utils/dates'
import type { ActionResult, EffectiveLeaveBalance } from '@/lib/types/app'
import type { Json } from '@/lib/types/database'

/**
 * Calculate service length in completed years from join_date to today (KL timezone).
 */
function getServiceYears(joinDate: string): number {
  const today = getKLToday()
  const [jy, jm, jd] = joinDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)

  let years = ty - jy
  if (tm < jm || (tm === jm && td < jd)) years--
  return Math.max(0, years)
}

/**
 * Fetch entitlement tiers from system_settings; falls back to hardcoded defaults if unavailable.
 */
async function getEntitlementDays(joinDate: string): Promise<number> {
  const serviceClient = createServiceClient()
  const { data: settings } = await serviceClient
    .from('system_settings')
    .select('entitlement_tier_lt2, entitlement_tier_2to5, entitlement_tier_gt5')
    .single()

  const lt2  = settings?.entitlement_tier_lt2  ?? 16
  const to5  = settings?.entitlement_tier_2to5 ?? 18
  const gt5  = settings?.entitlement_tier_gt5  ?? 22

  const serviceYears = getServiceYears(joinDate)
  if (serviceYears >= 5) return gt5
  if (serviceYears >= 2) return to5
  return lt2
}

/**
 * Fetch all leave balances for a user in a given year, enriched with
 * pending_in_flight and effective_balance.
 */
export async function getLeaveBalance(
  userId: string,
  year: number
): Promise<ActionResult<EffectiveLeaveBalance[]>> {
  const supabase = await createClient()

  // Fetch balances with leave type info
  const { data: balances, error: balanceError } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_type:leave_type_configs (
        id,
        name,
        allow_half_day,
        is_carry_forward_allowed,
        max_carry_forward_days
      )
    `)
    .eq('user_id', userId)
    .eq('year', year)

  if (balanceError) {
    return { success: false, error: balanceError.message }
  }

  if (!balances || balances.length === 0) {
    return { success: true, data: [] }
  }

  // Fetch pending-in-flight totals for each leave type
  const { data: pendingRequests, error: pendingError } = await supabase
    .from('leave_requests')
    .select('leave_type_id, duration_days, start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'Pending')

  if (pendingError) {
    return { success: false, error: pendingError.message }
  }

  // Get leave year start month from system settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('leave_year_start_month')
    .single()

  const leaveYearStartMonth = settings?.leave_year_start_month ?? 1

  // For each balance, compute pending_in_flight and effective_balance
  const enriched: EffectiveLeaveBalance[] = balances.map((balance) => {
    // Sum pending days that fall (at least partially) in this leave year
    const pending_in_flight = (pendingRequests ?? []).reduce((sum, req) => {
      if (req.leave_type_id !== balance.leave_type_id) return sum

      // For cross-year requests, we need to attribute days to the correct year
      const startYear = getLeaveYear(req.start_date, leaveYearStartMonth)
      const endYear   = getLeaveYear(req.end_date,   leaveYearStartMonth)

      if (startYear === year && endYear === year) {
        // Fully within this year
        return sum + (req.duration_days ?? 0)
      } else if (startYear === year) {
        // Cross-year: only the portion in this year matters
        // Approximation: we'll count the full duration here and let cross-year
        // split logic in applyForLeave handle the exact split
        return sum + (req.duration_days ?? 0)
      }
      return sum
    }, 0)

    const effective_balance =
      balance.allocated +
      balance.carried_forward -
      balance.used -
      pending_in_flight

    return {
      ...balance,
      leave_type: balance.leave_type as EffectiveLeaveBalance['leave_type'],
      pending_in_flight,
      effective_balance,
    }
  })

  return { success: true, data: enriched }
}

/**
 * Prorate a new hire's annual leave balance based on remaining months in the leave year.
 * Formula: floor((remaining_months / 12) * entitlement), minimum 1 day.
 * Called automatically when a new employee is created.
 */
export async function prorateNewHireBalance(userId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Fetch user details
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('join_date, department_id')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return { success: false, error: userError?.message ?? 'User not found' }
  }

  // Fetch system settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('leave_year_start_month')
    .single()

  const leaveYearStartMonth = settings?.leave_year_start_month ?? 1

  // Fetch all active leave types
  const { data: leaveTypes, error: ltError } = await supabase
    .from('leave_type_configs')
    .select('id, name, default_quota, is_paid')
    .eq('is_active', true)

  if (ltError || !leaveTypes) {
    return { success: false, error: ltError?.message ?? 'Failed to fetch leave types' }
  }

  const joinDate = user.join_date
  const today = getKLToday()
  const leaveYear = getLeaveYear(today, leaveYearStartMonth)

  // Calculate remaining months in the leave year from join date
  const leaveYearEnd = leaveYearStartMonth === 1
    ? `${leaveYear}-12-31`
    : `${leaveYear + 1}-${String(leaveYearStartMonth - 1).padStart(2, '0')}-${new Date(leaveYear + 1, leaveYearStartMonth - 1, 0).getDate()}`

  const [jy, jm] = joinDate.split('-').map(Number)
  const [ey, em] = leaveYearEnd.split('-').map(Number)

  // Remaining months = months from join date to end of leave year (inclusive)
  let remainingMonths = (ey - jy) * 12 + (em - jm) + 1
  remainingMonths = Math.max(0, Math.min(12, remainingMonths))

  // Fetch entitlement days once (async, reads from system_settings)
  const annualEntitlement = await getEntitlementDays(joinDate)

  // Build balance inserts
  const inserts = leaveTypes.map((lt) => {
    let allocated: number

    if (lt.name === 'Annual' || lt.name === 'Annual Leave') {
      // Prorate annual leave (entitlement fetched below, synchronously resolved)
      allocated = Math.floor((remainingMonths / 12) * annualEntitlement)
      allocated = Math.max(1, allocated) // Minimum 1 day floor
    } else {
      // All other leave types: full quota regardless of join date
      allocated = lt.default_quota ?? 0
    }

    return {
      user_id: userId,
      leave_type_id: lt.id,
      year: leaveYear,
      allocated,
      used: 0,
      carried_forward: 0,
    }
  })

  // Upsert balances (in case they already exist — idempotent)
  const { error: insertError } = await serviceClient
    .from('leave_balances')
    .upsert(inserts, {
      onConflict: 'user_id,leave_type_id,year',
      ignoreDuplicates: false,
    })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true }
}

/**
 * Re-evaluate a user's annual leave entitlement tier based on their current service length.
 * Only applies from the NEXT leave year onward — does not modify the current year.
 */
export async function recalculateEntitlement(userId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('join_date')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return { success: false, error: userError?.message ?? 'User not found' }
  }

  const { data: settings } = await supabase
    .from('system_settings')
    .select('leave_year_start_month')
    .single()

  const leaveYearStartMonth = settings?.leave_year_start_month ?? 1
  const today = getKLToday()
  const currentYear = getLeaveYear(today, leaveYearStartMonth)
  const nextYear = currentYear + 1

  const entitlementDays = await getEntitlementDays(user.join_date)

  // Fetch annual leave type
  const { data: annualLeaveType } = await supabase
    .from('leave_type_configs')
    .select('id')
    .ilike('name', '%annual%')
    .eq('is_active', true)
    .single()

  if (!annualLeaveType) {
    return { success: false, error: 'Annual leave type not found' }
  }

  const serviceClient = createServiceClient()

  // Upsert next year's balance with new entitlement
  const { error } = await serviceClient
    .from('leave_balances')
    .upsert(
      {
        user_id: userId,
        leave_type_id: annualLeaveType.id,
        year: nextYear,
        allocated: entitlementDays,
        used: 0,
        carried_forward: 0,
      },
      { onConflict: 'user_id,leave_type_id,year' }
    )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: { year: nextYear, allocated: entitlementDays } }
}

/**
 * Admin-only: adjust a user's leave balance by a delta (positive = add, negative = deduct).
 * Mandatory reason field. Writes to audit_log.
 */
export async function adjustLeaveBalance(
  actorId: string,
  userId: string,
  leaveTypeId: string,
  year: number,
  delta: number,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim() === '') {
    return { success: false, error: 'A reason is required for manual balance adjustments.' }
  }

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Verify actor is Admin
  const { data: actor } = await supabase
    .from('users')
    .select('role')
    .eq('id', actorId)
    .single()

  if (!actor || actor.role !== 'Admin') {
    return { success: false, error: 'Only administrators can adjust leave balances.' }
  }

  // Fetch current balance row
  const { data: balance, error: fetchError } = await serviceClient
    .from('leave_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year)
    .single()

  if (fetchError || !balance) {
    return { success: false, error: fetchError?.message ?? 'Balance record not found.' }
  }

  const beforeState: Json = { ...balance } as Json
  const newAllocated = balance.allocated + delta

  if (newAllocated < 0) {
    return {
      success: false,
      error: `Adjustment would result in a negative allocated balance (${newAllocated} days).`,
    }
  }

  // Apply adjustment to allocated column
  const { data: updated, error: updateError } = await serviceClient
    .from('leave_balances')
    .update({ allocated: newAllocated })
    .eq('id', balance.id)
    .select()
    .single()

  if (updateError || !updated) {
    return { success: false, error: updateError?.message ?? 'Failed to update balance.' }
  }

  // Write audit log
  await writeAuditLog(
    actorId,
    'ADJUST_BALANCE',
    'leave_balances',
    balance.id,
    beforeState,
    updated as Json,
    reason.trim()
  )

  return { success: true, data: updated }
}

/**
 * Year-end cron target: carry forward unused annual leave into the next year.
 * Only for leave types with is_carry_forward_allowed = true.
 * Respects max_carry_forward_days limit per leave type.
 * Sets carried_forward_expiry based on system_settings.carry_forward_expiry_month.
 */
export async function processYearEndCarryForward(): Promise<ActionResult> {
  const serviceClient = createServiceClient()

  const { data: settings, error: settingsError } = await serviceClient
    .from('system_settings')
    .select('carry_forward_expiry_month, leave_year_start_month')
    .single()

  if (settingsError || !settings) {
    return { success: false, error: settingsError?.message ?? 'System settings not found' }
  }

  const today = getKLToday()
  const currentYear = getLeaveYear(today, settings.leave_year_start_month)
  const nextYear = currentYear + 1

  // Expiry date: e.g. March 31 of next year
  const expiryMonth = settings.carry_forward_expiry_month
  const expiryDay = new Date(nextYear, expiryMonth, 0).getDate() // Last day of month
  const expiryDate = `${nextYear}-${String(expiryMonth).padStart(2, '0')}-${String(expiryDay).padStart(2, '0')}`

  // Fetch all leave types that allow carry forward
  const { data: leaveTypes, error: ltError } = await serviceClient
    .from('leave_type_configs')
    .select('id, max_carry_forward_days')
    .eq('is_carry_forward_allowed', true)
    .eq('is_active', true)

  if (ltError || !leaveTypes || leaveTypes.length === 0) {
    return { success: false, error: ltError?.message ?? 'No eligible leave types found' }
  }

  // Fetch all current-year balances for eligible leave types
  const leaveTypeIds = leaveTypes.map((lt) => lt.id)

  const { data: currentBalances, error: balanceError } = await serviceClient
    .from('leave_balances')
    .select('*')
    .eq('year', currentYear)
    .in('leave_type_id', leaveTypeIds)

  if (balanceError) {
    return { success: false, error: balanceError.message }
  }

  let processedCount = 0

  for (const balance of currentBalances ?? []) {
    const leaveType = leaveTypes.find((lt) => lt.id === balance.leave_type_id)
    if (!leaveType) continue

    const unusedDays = balance.allocated + balance.carried_forward - balance.used
    if (unusedDays <= 0) continue

    const carryForwardDays = Math.min(
      Math.max(0, unusedDays),
      leaveType.max_carry_forward_days ?? 0
    )

    if (carryForwardDays <= 0) continue

    // Upsert next year's balance row with carried_forward set
    const { error: upsertError } = await serviceClient
      .from('leave_balances')
      .upsert(
        {
          user_id: balance.user_id,
          leave_type_id: balance.leave_type_id,
          year: nextYear,
          allocated: balance.allocated, // Will be recalculated at year start
          used: 0,
          carried_forward: carryForwardDays,
          carried_forward_expiry: expiryDate,
        },
        { onConflict: 'user_id,leave_type_id,year' }
      )

    if (upsertError) {
      console.error('[processYearEndCarryForward] Upsert failed for user', balance.user_id, upsertError.message)
      continue
    }

    processedCount++
  }

  return { success: true, data: { processedCount, nextYear } }
}

/**
 * Cron target: expire carried-forward balances on the 1st of carry_forward_expiry_month.
 * Zeros out carried_forward and carried_forward_expiry for expired rows.
 */
export async function expireCarriedForwardBalances(): Promise<ActionResult> {
  const serviceClient = createServiceClient()

  const today = getKLToday()

  // Find all balance rows where carried_forward_expiry is in the past and carried_forward > 0
  const { data: expiredBalances, error } = await serviceClient
    .from('leave_balances')
    .select('*')
    .lte('carried_forward_expiry', today)
    .gt('carried_forward', 0)

  if (error) {
    return { success: false, error: error.message }
  }

  if (!expiredBalances || expiredBalances.length === 0) {
    return { success: true, data: { expiredCount: 0 } }
  }

  const ids = expiredBalances.map((b) => b.id)

  const { error: updateError } = await serviceClient
    .from('leave_balances')
    .update({ carried_forward: 0, carried_forward_expiry: null })
    .in('id', ids)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true, data: { expiredCount: ids.length } }
}

// ─── Internal audit log writer ─────────────────────────────────────────────────

/**
 * Write an entry to the audit_log table using the service role client.
 * Non-blocking — errors are logged but do not throw.
 */
export async function writeAuditLog(
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string,
  beforeState: Json,
  afterState: Json,
  reason?: string
): Promise<void> {
  try {
    const serviceClient = createServiceClient()
    await serviceClient.from('audit_log').insert({
      actor_id: actorId,
      action,
      target_table: targetTable,
      target_id: targetId,
      before_state: beforeState,
      after_state: afterState,
      reason: reason ?? null,
    })
  } catch (err) {
    console.error('[writeAuditLog] Failed to write audit log:', err)
  }
}
