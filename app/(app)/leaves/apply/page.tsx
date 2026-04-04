import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getKLToday, getLeaveYear } from '@/lib/utils/dates'
import { getLeaveBalance } from '@/lib/actions/balance'
import { RequestLeaveForm } from '@/components/leaves/RequestLeaveForm'

export default async function ApplyLeavePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fetch user profile ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('department_id, full_name')
    .eq('id', user.id)
    .single()

  // ── Fetch system settings ──────────────────────────────────────
  const { data: settings } = await supabase
    .from('system_settings')
    .select('leave_year_start_month, backdated_leave_window_days')
    .single()

  const leaveYearStartMonth = settings?.leave_year_start_month   ?? 1
  const backdatedWindowDays = settings?.backdated_leave_window_days ?? 7
  const today = getKLToday()
  const currentLeaveYear = getLeaveYear(today, leaveYearStartMonth)
  const nextLeaveYear = currentLeaveYear + 1

  // ── Fetch active leave types ───────────────────────────────────
  const { data: leaveTypes = [] } = await supabase
    .from('leave_type_configs')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // ── Fetch covering employees (same dept, active, not self) ─────
  const { data: coveringEmployees = [] } = profile?.department_id
    ? await supabase
        .from('users')
        .select('id, full_name')
        .eq('department_id', profile.department_id)
        .eq('is_active', true)
        .neq('id', user.id)
        .order('full_name')
    : { data: [] }

  // ── Fetch public holidays (current year + next) ────────────────
  const yearStart = leaveYearStartMonth === 1
    ? `${currentLeaveYear}-01-01`
    : `${currentLeaveYear}-${String(leaveYearStartMonth).padStart(2, '0')}-01`
  const nextYearEnd = leaveYearStartMonth === 1
    ? `${nextLeaveYear}-12-31`
    : (() => {
        const endMonth = leaveYearStartMonth - 1
        const calYear = nextLeaveYear + 1
        const lastDay = new Date(calYear, endMonth, 0).getDate()
        return `${calYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      })()

  let holidayQuery = supabase
    .from('public_holidays')
    .select('date')
    .gte('date', yearStart)
    .lte('date', nextYearEnd)

  if (profile?.department_id) {
    holidayQuery = holidayQuery.or(
      `department_id.is.null,department_id.eq.${profile.department_id}`
    )
  } else {
    holidayQuery = holidayQuery.is('department_id', null)
  }

  const { data: holidayRows = [] } = await holidayQuery
  const publicHolidays = (holidayRows ?? []).map((h) => h.date)

  // ── Fetch leave balances ───────────────────────────────────────
  const [currentBalanceResult, nextBalanceResult] = await Promise.all([
    getLeaveBalance(user.id, currentLeaveYear),
    getLeaveBalance(user.id, nextLeaveYear),
  ])

  const balances     = currentBalanceResult.data ?? []
  const nextBalances = nextBalanceResult.data     ?? []

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/leaves"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to My Leaves
        </Link>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
          Request Leave
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
          Fill in the details below to submit a leave request.
        </p>
      </div>

      <RequestLeaveForm
        leaveTypes={leaveTypes ?? []}
        balances={balances}
        nextYearBalances={nextBalances}
        coveringEmployees={(coveringEmployees ?? []) as { id: string; full_name: string }[]}
        publicHolidays={publicHolidays}
        settings={{ backdatedWindowDays, leaveYearStartMonth }}
        currentLeaveYear={currentLeaveYear}
        userDepartmentId={profile?.department_id ?? null}
      />
    </div>
  )
}
