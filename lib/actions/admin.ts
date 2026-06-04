'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { writeAuditLog } from '@/lib/actions/balance'
import { prorateNewHireBalance } from '@/lib/actions/balance'
import type {
  ActionResult,
  User,
  Department,
  LeaveTypeConfig,
  PublicHoliday,
  SystemSettings,
  NewEmployeeFormData,
  LeaveTypeFormData,
  HolidayFormData,
  SettingsFormData,
  AuditLogEntry,
  AuditLogFilters,
} from '@/lib/types/app'
import type { Json } from '@/lib/types/database'

// ─── Auth helpers ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<{ actorId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') {
    return { error: 'Administrator access required.' }
  }
  return { actorId: user.id }
}

// ─── Employee Management ───────────────────────────────────────────────────────

export async function getEmployees(filters?: {
  search?: string
  department_id?: string
  include_inactive?: boolean
}): Promise<ActionResult<(User & { department_name: string | null })[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const serviceClient = createServiceClient()
  let query = serviceClient
    .from('users')
    .select('*, departments(name)')
    .order('full_name')

  if (!filters?.include_inactive) {
    query = query.eq('is_active', true)
  }
  if (filters?.department_id) {
    query = query.eq('department_id', filters.department_id)
  }

  const { data, error } = await query

  if (error) return { success: false, error: error.message }

  const rows = (data ?? []).map((row) => {
    const { departments, ...rest } = row as typeof row & { departments: { name: string } | null }
    return { ...rest, department_name: departments?.name ?? null }
  })

  const filtered = filters?.search
    ? rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          r.email.toLowerCase().includes(filters.search!.toLowerCase())
      )
    : rows

  return { success: true, data: filtered as (User & { department_name: string | null })[] }
}

export async function createEmployee(
  actorId: string,
  data: NewEmployeeFormData
): Promise<ActionResult<User>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  // Create Supabase Auth user with auto-confirmed email and random temp password
  const { data: authResult, error: authError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    password: crypto.randomUUID(),
    email_confirm: true,
  })

  if (authError || !authResult.user) {
    return { success: false, error: authError?.message ?? 'Failed to create auth user.' }
  }

  const newUserId = authResult.user.id

  // Insert into users table
  const { data: newUser, error: insertError } = await serviceClient
    .from('users')
    .insert({
      id: newUserId,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      department_id: data.department_id,
      join_date: data.join_date,
      is_active: true,
    })
    .select()
    .single()

  if (insertError || !newUser) {
    // Rollback auth user on insert failure
    await serviceClient.auth.admin.deleteUser(newUserId)
    return { success: false, error: insertError?.message ?? 'Failed to create employee record.' }
  }

  // Prorate leave balances (non-blocking — failure should not block creation)
  try {
    await prorateNewHireBalance(newUserId)
  } catch {
    // log but don't fail
  }

  // Send password reset so the new employee can set their own password
  try {
    await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email: data.email,
    })
  } catch {
    // non-blocking
  }

  await writeAuditLog(auth.actorId, 'CREATE_EMPLOYEE', 'users', newUserId, {} as Json, newUser as Json)

  revalidatePath('/admin/employees')
  return { success: true, data: newUser as User }
}

export async function deactivateEmployee(
  actorId: string,
  userId: string
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  // Fetch current user record
  const { data: targetUser, error: fetchError } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (fetchError || !targetUser) {
    return { success: false, error: 'Employee not found.' }
  }

  if (!targetUser.is_active) {
    return { success: false, error: 'Employee is already deactivated.' }
  }

  // Block if sole manager of a department with no acting manager
  if (targetUser.role === 'Manager') {
    const { data: dept } = await serviceClient
      .from('departments')
      .select('id, name, acting_manager_id')
      .eq('manager_id', userId)
      .is('acting_manager_id', null)
      .limit(1)
      .single()

    if (dept) {
      return {
        success: false,
        error: `Cannot deactivate this manager — they are the sole manager of "${dept.name}". Please assign a replacement or acting manager first.`,
      }
    }
  }

  const beforeState: Json = { ...targetUser } as Json

  const { data: updated, error: updateError } = await serviceClient
    .from('users')
    .update({ is_active: false })
    .eq('id', userId)
    .select()
    .single()

  if (updateError || !updated) {
    return { success: false, error: updateError?.message ?? 'Failed to deactivate employee.' }
  }

  // Disable Supabase Auth login (ban indefinitely)
  await serviceClient.auth.admin.updateUserById(userId, { ban_duration: '876600h' })

  await writeAuditLog(auth.actorId, 'DEACTIVATE_EMPLOYEE', 'users', userId, beforeState, updated as Json)

  revalidatePath('/admin/employees')
  return { success: true }
}

export async function transferEmployeeDepartment(
  actorId: string,
  userId: string,
  newDepartmentId: string
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  const { data: targetUser, error: fetchError } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (fetchError || !targetUser) {
    return { success: false, error: 'Employee not found.' }
  }

  const beforeState: Json = { ...targetUser } as Json

  const { data: updated, error: updateError } = await serviceClient
    .from('users')
    .update({ department_id: newDepartmentId })
    .eq('id', userId)
    .select()
    .single()

  if (updateError || !updated) {
    return { success: false, error: updateError?.message ?? 'Failed to transfer employee.' }
  }

  await writeAuditLog(auth.actorId, 'TRANSFER_EMPLOYEE', 'users', userId, beforeState, updated as Json)

  revalidatePath('/admin/employees')
  return { success: true }
}

export async function getDepartments(): Promise<ActionResult<Department[]>> {
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('departments')
    .select('*')
    .order('name')

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Department[] }
}

export async function getAllUsers(): Promise<ActionResult<Pick<User, 'id' | 'full_name' | 'email' | 'role'>[]>> {
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('users')
    .select('id, full_name, email, role')
    .eq('is_active', true)
    .order('full_name')

  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

// ─── Leave Type Management ─────────────────────────────────────────────────────

export async function getLeaveTypes(includeInactive = false): Promise<ActionResult<LeaveTypeConfig[]>> {
  const serviceClient = createServiceClient()
  let query = serviceClient.from('leave_type_configs').select('*').order('name')
  if (!includeInactive) {
    query = query.eq('is_active', true)
  }
  const { data, error } = await query
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeaveTypeConfig[] }
}

export async function createLeaveType(
  actorId: string,
  data: LeaveTypeFormData
): Promise<ActionResult<LeaveTypeConfig>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  const { data: created, error } = await serviceClient
    .from('leave_type_configs')
    .insert(data)
    .select()
    .single()

  if (error || !created) {
    return { success: false, error: error?.message ?? 'Failed to create leave type.' }
  }

  await writeAuditLog(auth.actorId, 'CREATE_LEAVE_TYPE', 'leave_type_configs', created.id, {} as Json, created as Json)

  revalidatePath('/admin/leave-types')
  return { success: true, data: created as LeaveTypeConfig }
}

export async function updateLeaveType(
  actorId: string,
  leaveTypeId: string,
  data: Partial<LeaveTypeFormData>
): Promise<ActionResult<LeaveTypeConfig>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  const { data: before, error: fetchError } = await serviceClient
    .from('leave_type_configs')
    .select('*')
    .eq('id', leaveTypeId)
    .single()

  if (fetchError || !before) {
    return { success: false, error: 'Leave type not found.' }
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('leave_type_configs')
    .update(data)
    .eq('id', leaveTypeId)
    .select()
    .single()

  if (updateError || !updated) {
    return { success: false, error: updateError?.message ?? 'Failed to update leave type.' }
  }

  await writeAuditLog(auth.actorId, 'UPDATE_LEAVE_TYPE', 'leave_type_configs', leaveTypeId, before as Json, updated as Json)

  revalidatePath('/admin/leave-types')
  return { success: true, data: updated as LeaveTypeConfig }
}

// ─── Holiday Management ────────────────────────────────────────────────────────

export async function getPublicHolidays(year?: number): Promise<ActionResult<(PublicHoliday & { department_name: string | null })[]>> {
  const serviceClient = createServiceClient()
  let query = serviceClient
    .from('public_holidays')
    .select('*, departments(name)')
    .order('date')

  if (year) {
    query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  }

  const { data, error } = await query
  if (error) return { success: false, error: error.message }

  const rows = (data ?? []).map((row) => {
    const { departments, ...rest } = row as typeof row & { departments: { name: string } | null }
    return { ...rest, department_name: departments?.name ?? null }
  })

  return { success: true, data: rows as (PublicHoliday & { department_name: string | null })[] }
}

export async function addPublicHoliday(
  actorId: string,
  data: HolidayFormData
): Promise<ActionResult<PublicHoliday>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  const { data: created, error } = await serviceClient
    .from('public_holidays')
    .insert({
      name: data.name,
      date: data.date,
      department_id: data.department_id ?? null,
    })
    .select()
    .single()

  if (error || !created) {
    return { success: false, error: error?.message ?? 'Failed to add holiday.' }
  }

  await writeAuditLog(auth.actorId, 'ADD_PUBLIC_HOLIDAY', 'public_holidays', created.id, {} as Json, created as Json)

  revalidatePath('/admin/holidays')
  return { success: true, data: created as PublicHoliday }
}

export async function deletePublicHoliday(
  actorId: string,
  holidayId: string
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  const { data: before, error: fetchError } = await serviceClient
    .from('public_holidays')
    .select('*')
    .eq('id', holidayId)
    .single()

  if (fetchError || !before) {
    return { success: false, error: 'Holiday not found.' }
  }

  const { error: deleteError } = await serviceClient
    .from('public_holidays')
    .delete()
    .eq('id', holidayId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  await writeAuditLog(auth.actorId, 'DELETE_PUBLIC_HOLIDAY', 'public_holidays', holidayId, before as Json, {} as Json)

  revalidatePath('/admin/holidays')
  return { success: true }
}

export async function bulkImportPublicHolidays(
  actorId: string,
  csvText: string
): Promise<ActionResult<{ imported: number }>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const lines = csvText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { success: false, error: 'CSV is empty.' }
  }

  // Detect header row
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('name') || firstLine.includes('date')
  const dataLines = hasHeader ? lines.slice(1) : lines

  const inserts: { name: string; date: string; department_id: null }[] = []
  const parseErrors: string[] = []

  for (const line of dataLines) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const name = cols[0]
    const date = cols[1]

    if (!name || !date) {
      parseErrors.push(`Skipped invalid row: "${line}"`)
      continue
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      parseErrors.push(`Invalid date format "${date}" — expected YYYY-MM-DD`)
      continue
    }

    inserts.push({ name, date, department_id: null })
  }

  if (inserts.length === 0) {
    return { success: false, error: `No valid rows to import. ${parseErrors.join('; ')}` }
  }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.from('public_holidays').insert(inserts)

  if (error) {
    return { success: false, error: error.message }
  }

  await writeAuditLog(
    auth.actorId,
    'BULK_IMPORT_HOLIDAYS',
    'public_holidays',
    'bulk',
    {} as Json,
    { imported: inserts.length } as Json
  )

  revalidatePath('/admin/holidays')
  return { success: true, data: { imported: inserts.length } }
}

// ─── System Settings ───────────────────────────────────────────────────────────

export async function getSystemSettings(): Promise<ActionResult<SystemSettings>> {
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('system_settings')
    .select('*')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'System settings not found.' }
  }
  return { success: true, data: data as SystemSettings }
}

export async function updateSystemSettings(
  actorId: string,
  data: SettingsFormData
): Promise<ActionResult<SystemSettings>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  const { data: before, error: fetchError } = await serviceClient
    .from('system_settings')
    .select('*')
    .single()

  if (fetchError || !before) {
    return { success: false, error: 'System settings not found.' }
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('system_settings')
    .update({
      approval_sla_days: data.approval_sla_days,
      backdated_leave_window_days: data.backdated_leave_window_days,
      carry_forward_expiry_month: data.carry_forward_expiry_month,
      encashment_enabled: data.encashment_enabled,
      leave_year_start_month: data.leave_year_start_month,
      entitlement_tier_lt2: data.entitlement_tier_lt2,
      entitlement_tier_2to5: data.entitlement_tier_2to5,
      entitlement_tier_gt5: data.entitlement_tier_gt5,
    })
    .eq('id', before.id)
    .select()
    .single()

  if (updateError || !updated) {
    return { success: false, error: updateError?.message ?? 'Failed to update settings.' }
  }

  await writeAuditLog(auth.actorId, 'UPDATE_SYSTEM_SETTINGS', 'system_settings', before.id, before as Json, updated as Json)

  revalidatePath('/admin/policies')
  return { success: true, data: updated as SystemSettings }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

const AUDIT_PAGE_SIZE = 50

export async function getAuditLog(
  filters: AuditLogFilters,
  page: number
): Promise<ActionResult<{ entries: AuditLogEntry[]; total: number }>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()
  const offset = (page - 1) * AUDIT_PAGE_SIZE

  let query = serviceClient
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + AUDIT_PAGE_SIZE - 1)

  if (filters.actor_id) {
    query = query.eq('actor_id', filters.actor_id)
  }
  if (filters.action_type) {
    query = query.eq('action', filters.action_type)
  }
  if (filters.from_date) {
    query = query.gte('created_at', `${filters.from_date}T00:00:00`)
  }
  if (filters.to_date) {
    query = query.lte('created_at', `${filters.to_date}T23:59:59`)
  }

  const { data, count, error } = await query

  if (error) return { success: false, error: error.message }

  // Join with users to get actor names
  const actorIds = [...new Set((data ?? []).map((e) => e.actor_id).filter(Boolean))]
  let actorMap: Record<string, string> = {}

  if (actorIds.length > 0) {
    const { data: actors } = await serviceClient
      .from('users')
      .select('id, full_name')
      .in('id', actorIds as string[])

    actorMap = Object.fromEntries((actors ?? []).map((a) => [a.id, a.full_name]))
  }

  const entries: AuditLogEntry[] = (data ?? []).map((entry) => ({
    ...entry,
    actor_name: entry.actor_id ? (actorMap[entry.actor_id] ?? null) : null,
  }))

  return { success: true, data: { entries, total: count ?? 0 } }
}

export async function getDistinctAuditActors(): Promise<ActionResult<Pick<User, 'id' | 'full_name'>[]>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()

  // Get distinct actor_ids from audit_log
  const { data: logs, error } = await serviceClient
    .from('audit_log')
    .select('actor_id')
    .not('actor_id', 'is', null)

  if (error) return { success: false, error: error.message }

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))] as string[]

  if (actorIds.length === 0) return { success: true, data: [] }

  const { data: actors, error: actorError } = await serviceClient
    .from('users')
    .select('id, full_name')
    .in('id', actorIds)
    .order('full_name')

  if (actorError) return { success: false, error: actorError.message }

  return { success: true, data: actors ?? [] }
}

export async function getDistinctAuditActions(): Promise<ActionResult<string[]>> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('audit_log')
    .select('action')

  if (error) return { success: false, error: error.message }

  const actions = [...new Set((data ?? []).map((d) => d.action))].sort()
  return { success: true, data: actions }
}
