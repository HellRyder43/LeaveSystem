import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Service role client — bypasses RLS entirely.
 * Use ONLY in server-side code for:
 *   - writeAuditLog()
 *   - adjustLeaveBalance()
 *   - Any operation requiring elevated DB access
 *
 * Never expose this client to the browser or pass it to client components.
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
