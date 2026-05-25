import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getKLToday } from '@/lib/utils/dates'
import { getWhoIsOutToday } from '@/lib/actions/reports'
import { getDepartments } from '@/lib/actions/calendar'
import { WhosOutPage } from '@/components/whos-out/WhosOutPage'
import type { UserRole } from '@/lib/types/app'

export default async function WhosOutTodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const userRole = profile.role as UserRole
  const userDepartmentId = profile.department_id as string | null

  const today = getKLToday()
  const todayLabel = new Date(
    ...today.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))) as [number, number, number]
  ).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [entriesResult, deptResult] = await Promise.all([
    getWhoIsOutToday(),
    getDepartments(),
  ])

  const entries = entriesResult.data ?? []
  const departments = deptResult.data ?? []

  return (
    <WhosOutPage
      entries={entries}
      userRole={userRole}
      userDepartmentId={userDepartmentId}
      departments={departments}
      today={today}
      todayLabel={todayLabel}
    />
  )
}
