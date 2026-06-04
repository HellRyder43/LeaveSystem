import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonPageHeader, SkeletonApprovalCard } from '@/components/ui/skeleton-card'

export default function ApprovalsLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <SkeletonPageHeader />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Approval cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonApprovalCard key={i} />
        ))}
      </div>
    </div>
  )
}
