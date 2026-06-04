import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonPageHeader, SkeletonNotificationItem } from '@/components/ui/skeleton-card'

export default function NotificationsLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonPageHeader />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {/* Group label */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50">
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonNotificationItem key={i} />
        ))}

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50">
          <Skeleton className="h-3 w-20" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonNotificationItem key={`y-${i}`} />
        ))}
      </div>
    </div>
  )
}
