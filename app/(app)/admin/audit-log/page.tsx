import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuditLogTable } from '@/components/admin/AuditLogTable'
import { getAuditLog, getDistinctAuditActors, getDistinctAuditActions } from '@/lib/actions/admin'

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const [logsResult, actorsResult, actionsResult] = await Promise.all([
    getAuditLog({}, 1),
    getDistinctAuditActors(),
    getDistinctAuditActions(),
  ])

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Audit Log</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Read-only history of all admin and system actions.
        </p>
      </div>
      <AuditLogTable
        initialEntries={logsResult.data?.entries ?? []}
        initialTotal={logsResult.data?.total ?? 0}
        actorOptions={actorsResult.data ?? []}
        actionOptions={actionsResult.data ?? []}
      />
    </div>
  )
}
