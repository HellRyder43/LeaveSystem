import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportsPage } from '@/components/admin/ReportsPage'
import { getDepartments, getLeaveTypes } from '@/lib/actions/admin'

export default async function ReportsPageRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const [departmentsResult, leaveTypesResult] = await Promise.all([
    getDepartments(),
    getLeaveTypes(false),
  ])

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Reports & Analytics</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Leave utilization, headcount, liability, and monthly trends.
        </p>
      </div>
      <ReportsPage
        departments={(departmentsResult.data ?? []).map((d) => ({ id: d.id, name: d.name }))}
        leaveTypes={(leaveTypesResult.data ?? []).map((lt) => ({ id: lt.id, name: lt.name }))}
      />
    </div>
  )
}
