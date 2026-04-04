'use client'

import { useTransition } from 'react'
import { Loader2, CheckSquare } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { bulkApproveLeaveRequests } from '@/lib/actions/approvals'
import { toast } from 'sonner'
import type { PendingApprovalRequest } from '@/lib/actions/approvals'

interface BulkApproveDialogProps {
  selectedRequests: PendingApprovalRequest[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (approvedIds: string[]) => void
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const [, m, day] = d.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(day)} ${months[parseInt(m) - 1]}`
  }
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}

export function BulkApproveDialog({
  selectedRequests,
  open,
  onOpenChange,
  onSuccess,
}: BulkApproveDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleBulkApprove() {
    const ids = selectedRequests.map((r) => r.id)
    startTransition(async () => {
      const result = await bulkApproveLeaveRequests(ids)
      if (!result.success) {
        toast.error(result.error ?? 'Bulk approve failed.')
        return
      }
      const { approved, failed } = result.data!
      if (failed.length === 0) {
        toast.success(`${approved.length} request${approved.length !== 1 ? 's' : ''} approved.`)
      } else {
        toast.warning(
          `${approved.length} approved, ${failed.length} failed. Check individual requests.`
        )
      }
      onOpenChange(false)
      onSuccess(approved)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Bulk Approve {selectedRequests.length} Request{selectedRequests.length !== 1 ? 's' : ''}
          </AlertDialogTitle>
          <AlertDialogDescription>
            The following requests will be approved. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Request list */}
        <div className="max-h-56 overflow-y-auto space-y-1.5 my-2 pr-1">
          {selectedRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {req.user?.full_name ?? '—'}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {req.leave_type?.name ?? '—'} · {formatDateRange(req.start_date, req.end_date)}
                {' '}({req.duration_days} day{req.duration_days !== 1 ? 's' : ''})
              </span>
            </div>
          ))}
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkApprove}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving…</>
            ) : (
              `Approve ${selectedRequests.length} Request${selectedRequests.length !== 1 ? 's' : ''}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
