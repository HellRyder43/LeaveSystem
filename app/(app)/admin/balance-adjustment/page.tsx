import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BalanceAdjustmentForm } from '@/components/admin/BalanceAdjustmentForm'
import { getEmployees } from '@/lib/actions/admin'
import { getLeaveTypes } from '@/lib/actions/admin'

export default async function BalanceAdjustmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const [employeesResult, leaveTypesResult] = await Promise.all([
    getEmployees({ include_inactive: false }),
    getLeaveTypes(false),
  ])

  const employees = (employeesResult.data ?? []).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    email: e.email,
  }))

  const leaveTypes = (leaveTypesResult.data ?? []).map((lt) => ({
    id: lt.id,
    name: lt.name,
  }))

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Manual Balance Adjustment</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Adjust any employee&apos;s leave balance with a mandatory audit reason.
        </p>
      </div>
      <BalanceAdjustmentForm employees={employees} leaveTypes={leaveTypes} />
    </div>
  )
}
