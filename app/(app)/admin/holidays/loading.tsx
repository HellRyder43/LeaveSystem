import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/skeleton-card'

export default function HolidaysLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonPageHeader />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
      <SkeletonTable rows={10} cols={4} />
    </div>
  )
}
