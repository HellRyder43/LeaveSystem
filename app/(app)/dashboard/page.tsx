import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getKLToday, getLeaveYear } from '@/lib/utils/dates'
import { getLeaveBalance } from '@/lib/actions/balance'
import { getUserLeaveHistory } from '@/lib/actions/leave'
import { getWhoIsOutToday } from '@/lib/actions/reports'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { RecentLeavesSnapshot } from '@/components/dashboard/RecentLeavesSnapshot'
import { WhoIsOutWidget } from '@/components/dashboard/WhoIsOutWidget'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, department_id')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const departmentId = profile?.department_id ?? null

  // Resolve current leave year
  const { data: settings } = await supabase
    .from('system_settings')
    .select('leave_year_start_month')
    .single()
  const leaveYearStartMonth = settings?.leave_year_start_month ?? 1
  const currentYear = getLeaveYear(getKLToday(), leaveYearStartMonth)

  // Fetch in parallel
  const [balanceResult, historyResult, whoIsOutResult] = await Promise.all([
    getLeaveBalance(user.id, currentYear),
    getUserLeaveHistory(user.id, { pageSize: 5 }),
    getWhoIsOutToday(departmentId),
  ])

  const balances = balanceResult.data ?? []
  const recentRequests = historyResult.data?.requests ?? []
  const whoIsOut = whoIsOutResult.data ?? []

  // Summary stat: total days used across all paid leave types this year
  const totalUsed = balances.reduce((sum, b) => sum + (b.used ?? 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Welcome back, {firstName}!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
            Leave overview for {currentYear} · {getKLToday()}
          </p>
        </div>
        <Link
          href="/leaves/apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 hover:brightness-110 transition-all duration-150 self-start sm:self-auto"
        >
          + Request Time Off
        </Link>
      </div>

      {/* Balance cards */}
      {balances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
            No leave balances found for {currentYear}. Contact your administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {balances.map((balance, idx) => (
            <BalanceCard key={balance.id} balance={balance} colorIndex={idx} />
          ))}
        </div>
      )}

      {/* Summary strip */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Total Used</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{totalUsed}<span className="text-xs font-normal ml-1">days</span></p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Leave Types</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{balances.length}<span className="text-xs font-normal ml-1">types</span></p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Pending Requests</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
              {recentRequests.filter((r) => r.status === 'Pending').length}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Out Today</p>
            <p className="text-lg font-black text-blue-600 dark:text-blue-400">
              {whoIsOut.length}<span className="text-xs font-normal ml-1">colleagues</span>
            </p>
          </div>
        </div>
      )}

      {/* Bottom grid: recent leaves + who's out */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentLeavesSnapshot requests={recentRequests} />
        <WhoIsOutWidget entries={whoIsOut} />
      </div>
    </div>
  )
}
