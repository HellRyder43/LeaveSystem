'use server'

import { createClient } from '@/lib/supabase/server'
import { getKLToday } from '@/lib/utils/dates'
import type { ActionResult } from '@/lib/types/app'

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
  } | null
  leave_type: {
    id: string
    name: string
  } | null
}

/**
 * Returns all employees on approved leave today (Asia/KL date).
 * Optionally filter to a specific department.
 */
export async function getWhoIsOutToday(
  departmentId?: string | null
): Promise<ActionResult<WhoIsOutEntry[]>> {
  const supabase = await createClient()
  const today = getKLToday()

  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      duration_modifier,
      user:users!leave_requests_user_id_fkey (id, full_name, department_id),
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
