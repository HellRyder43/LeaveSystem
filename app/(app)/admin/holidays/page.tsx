import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HolidayTable } from '@/components/admin/HolidayTable'
import { getPublicHolidays, getDepartments } from '@/lib/actions/admin'
import { getKLToday } from '@/lib/utils/dates'

export default async function HolidaysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Admin') redirect('/dashboard')

  const currentYear = parseInt(getKLToday().slice(0, 4))

  const [holidaysResult, departmentsResult] = await Promise.all([
    getPublicHolidays(currentYear),
    getDepartments(),
  ])

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Holiday Calendar</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
          Add and manage public holidays. Global holidays apply to all departments.
        </p>
      </div>
      <HolidayTable
        initialHolidays={holidaysResult.data ?? []}
        departments={(departmentsResult.data ?? []).map((d) => ({ id: d.id, name: d.name }))}
        currentYear={currentYear}
      />
    </div>
  )
}
