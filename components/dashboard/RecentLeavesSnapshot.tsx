import Link from 'next/link'
import type { LeaveRequestWithDetails, LeaveStatus } from '@/lib/types/app'

interface RecentLeavesSnapshotProps {
  requests: LeaveRequestWithDetails[]
}

const STATUS_STYLES: Record<LeaveStatus, string> = {
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function RecentLeavesSnapshot({ requests }: RecentLeavesSnapshotProps) {
  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Leave Requests</h3>
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
          No leave requests yet.{' '}
          <Link href="/leaves/apply" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
            Apply for leave
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Leave Requests</h3>
        <Link
          href="/leaves"
          className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {requests.map((req) => {
          const status = req.status as LeaveStatus
          const leaveTypeName = (req.leave_type as { name?: string } | undefined)?.name ?? '—'
          const sameDay = req.start_date === req.end_date
          const dateLabel = sameDay
            ? formatDate(req.start_date)
            : `${formatDate(req.start_date)} – ${formatDate(req.end_date)}`
          const durationLabel = req.duration_modifier !== 'Full'
            ? `${req.duration_modifier} (0.5d)`
            : `${req.duration_days}d`

          return (
            <div key={req.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {leaveTypeName}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{dateLabel}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 dark:text-slate-500">{durationLabel}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.Cancelled}`}>
                  {status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
