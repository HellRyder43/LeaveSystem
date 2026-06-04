import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/skeleton-card'

export default function LeaveTypesLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonPageHeader />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <SkeletonTable rows={8} cols={7} />
    </div>
  )
}
