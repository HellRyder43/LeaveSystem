import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonPageHeader } from '@/components/ui/skeleton-card'

export default function PoliciesLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <SkeletonPageHeader />

      <div className="space-y-6">
        {/* Section: Entitlement Tiers */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Section: SLA & Windows */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>

        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    </div>
  )
}
