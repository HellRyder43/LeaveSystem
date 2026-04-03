import Link from 'next/link'
import type { WhoIsOutEntry } from '@/lib/actions/reports'

interface WhoIsOutWidgetProps {
  entries: WhoIsOutEntry[]
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
  })
}

export function WhoIsOutWidget({ entries }: WhoIsOutWidgetProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Who&apos;s Out Today
        </h3>
        <Link
          href="/whos-out"
          className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
        >
          View all
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-slate-400 dark:text-slate-500">
          No colleagues on leave today.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((entry) => {
            const sameDay = entry.start_date === entry.end_date
            const returnDate = sameDay
              ? 'Back tomorrow'
              : `Until ${formatDate(entry.end_date)}`

            return (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                {/* Avatar initials */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {entry.user?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {entry.user?.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{returnDate}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
