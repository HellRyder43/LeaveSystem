import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonPageHeader } from '@/components/ui/skeleton-card'

export default function ApplyLeaveLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <SkeletonPageHeader />

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        {/* Leave type */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Date range */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-3 w-48" />
        </div>

        {/* Duration modifier */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>

        {/* Covering employee */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Balance preview */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Submit */}
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  )
}
