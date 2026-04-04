'use client'

import { useState, useTransition } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { rejectLeaveRequest } from '@/lib/actions/approvals'
import { toast } from 'sonner'

interface RejectDialogProps {
  requestId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (requestId: string) => void
}

export function RejectDialog({
  requestId,
  employeeName,
  open,
  onOpenChange,
  onSuccess,
}: RejectDialogProps) {
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleReject() {
    if (!comment.trim()) return

    startTransition(async () => {
      const result = await rejectLeaveRequest(requestId, comment.trim())
      if (result.success) {
        toast.success('Leave request rejected.')
        setComment('')
        onOpenChange(false)
        onSuccess(requestId)
      } else {
        toast.error(result.error ?? 'Failed to reject request.')
      }
    })
  }

  function handleOpenChange(val: boolean) {
    if (!isPending) {
      setComment('')
      onOpenChange(val)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5" />
            Reject Leave Request
          </DialogTitle>
          <DialogDescription>
            Rejecting leave for <span className="font-semibold">{employeeName}</span>.
            A comment is required so the employee understands the reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reject-comment">
            Comment <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="reject-comment"
            placeholder="e.g. Insufficient staffing during this period. Please choose alternative dates."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={isPending}
            className="resize-none"
          />
          {comment.length === 0 && (
            <p className="text-xs text-rose-500">Comment is required.</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!comment.trim() || isPending}
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting…</>
            ) : (
              'Reject Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
