import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeaveTypeTable } from '@/components/admin/LeaveTypeTable'
import { getLeaveTypes } from '@/lib/actions/admin'

export default async function LeaveTypesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const result = await getLeaveTypes(true)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Leave Types</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Configure leave type policies, quotas, and rules.
        </p>
      </div>
      <LeaveTypeTable initialLeaveTypes={result.data ?? []} />
    </div>
  )
}
