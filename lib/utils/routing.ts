import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the approver for a leave request submitted by the given user.
 * Priority: acting_manager_id → department manager_id (if active) → Admin fallback.
 * Always returns a valid user ID — never null if at least one active Admin exists.
 */
export async function resolveApprover(userId: string): Promise<string | null> {
  const supabase = await createClient()

  // Fetch user's department
  const { data: userData } = await supabase
    .from('users')
    .select('department_id')
    .eq('id', userId)
    .single()

  if (userData?.department_id) {
    // Fetch department's acting manager and primary manager
    const { data: dept } = await supabase
      .from('departments')
      .select('acting_manager_id, manager_id')
      .eq('id', userData.department_id)
      .single()

    if (dept) {
      // Try acting manager first
      if (dept.acting_manager_id) {
        const { data: acting } = await supabase
          .from('users')
          .select('id')
          .eq('id', dept.acting_manager_id)
          .eq('is_active', true)
          .single()
        if (acting) return acting.id
      }

      // Try department manager
      if (dept.manager_id) {
        const { data: manager } = await supabase
          .from('users')
          .select('id')
          .eq('id', dept.manager_id)
          .eq('is_active', true)
          .single()
        if (manager) return manager.id
      }
    }
  }

  // Admin fallback — pick earliest created active admin
  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'Admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return admin?.id ?? null
}
