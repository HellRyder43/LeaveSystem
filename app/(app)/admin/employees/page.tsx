import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeeTable } from '@/components/admin/EmployeeTable'
import { getEmployees, getDepartments } from '@/lib/actions/admin'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const [employeesResult, departmentsResult] = await Promise.all([
    getEmployees({ include_inactive: true }),
    getDepartments(),
  ])

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Manage Employees</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Onboard new employees, deactivate accounts, and transfer departments.
        </p>
      </div>
      <EmployeeTable
        initialEmployees={employeesResult.data ?? []}
        departments={(departmentsResult.data ?? []).map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  )
}
