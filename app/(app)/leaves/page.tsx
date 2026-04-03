import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getKLToday, getLeaveYear } from '@/lib/utils/dates'
import { getUserLeaveHistory } from '@/lib/actions/leave'
import { LeaveHistoryTable } from '@/components/leaves/LeaveHistoryTable'

interface PageProps {
  searchParams: Promise<{ year?: string; status?: string; page?: string }>
}

export default async function LeavesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('system_settings')
    .select('leave_year_start_month')
    .single()
  const leaveYearStartMonth = settings?.leave_year_start_month ?? 1
  const currentLeaveYear = getLeaveYear(getKLToday(), leaveYearStartMonth)

  const params = await searchParams
  const year = params.year ? Number(params.year) : currentLeaveYear
  const status = params.status ?? 'All'
  const page = params.page ? Math.max(1, Number(params.page)) : 1
  const pageSize = 10

  const result = await getUserLeaveHistory(user.id, { year, status, page, pageSize })
  const { requests = [], total = 0 } = result.data ?? {}

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">My Leaves</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
            Your leave request history and status.
          </p>
        </div>
        <Link
          href="/leaves/apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 hover:brightness-110 transition-all duration-150 self-start sm:self-auto"
        >
          + New Request
        </Link>
      </div>

      <LeaveHistoryTable
        requests={requests}
        total={total}
        page={page}
        pageSize={pageSize}
        currentYear={year}
        currentStatus={status}
      />
    </div>
  )
}
