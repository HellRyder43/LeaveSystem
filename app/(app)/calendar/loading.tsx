import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonPageHeader } from '@/components/ui/skeleton-card'

export default function CalendarLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonPageHeader />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center py-2">
            <Skeleton className="h-3 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar grid — 5 rows × 7 cols */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl border border-slate-100 dark:border-slate-800 p-1.5 space-y-1">
            <Skeleton className="h-3 w-5" />
            {i % 5 === 0 && <Skeleton className="h-4 w-full rounded" />}
            {i % 7 === 2 && <Skeleton className="h-4 w-full rounded" />}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-8 rounded" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
