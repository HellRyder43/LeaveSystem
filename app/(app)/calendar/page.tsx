import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getKLToday } from '@/lib/utils/dates'
import { getTeamCalendarData, getDepartments } from '@/lib/actions/calendar'
import { TeamCalendar } from '@/components/calendar/TeamCalendar'
import type { UserRole } from '@/lib/types/app'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const userRole = profile.role as UserRole
  const userDepartmentId = profile.department_id as string | null

  // Today's date in KL time → derive current month
  const today = getKLToday() // YYYY-MM-DD
  const [yearStr, monthStr] = today.split('-')
  const currentYear = parseInt(yearStr)
  const currentMonth = parseInt(monthStr) // 1-based

  // Determine the department to query for initial load
  // Admin with no department filter → null (all departments)
  // Employee / Manager → their own department
  const initialDeptId = userRole === 'Admin' ? null : userDepartmentId

  // Fetch initial data in parallel
  const [calendarResult, deptResult] = await Promise.all([
    getTeamCalendarData(currentYear, currentMonth, initialDeptId),
    userRole === 'Admin' ? getDepartments() : Promise.resolve({ success: true, data: [] }),
  ])

  const initialData = calendarResult.data ?? { leaves: [], holidays: [] }
  const departments = deptResult.data ?? []

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <TeamCalendar
        initialData={initialData}
        initialYear={currentYear}
        initialMonth={currentMonth}
        currentUserId={user.id}
        userRole={userRole}
        userDepartmentId={userDepartmentId}
        departments={departments}
      />
    </div>
  )
}
