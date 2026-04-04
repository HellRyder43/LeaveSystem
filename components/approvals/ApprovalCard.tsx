'use client'

import { useState, useTransition } from 'react'
import {
  Calendar, Clock, Paperclip, Users, AlertTriangle, CheckCircle2,
  XCircle, ExternalLink, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RejectDialog } from './RejectDialog'
import { approveLeaveRequest, getAttachmentSignedUrl } from '@/lib/actions/approvals'
import { toast } from 'sonner'
import type { PendingApprovalRequest } from '@/lib/actions/approvals'
import type { UserRole } from '@/lib/types/app'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`
}

interface SlaBadgeProps {
  daysElapsed: number
  slaLimit: number
  isEscalated: boolean
}

function SlaBadge({ daysElapsed, slaLimit, isEscalated }: SlaBadgeProps) {
  const remaining = slaLimit - daysElapsed

  if (isEscalated) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
        <AlertTriangle className="w-3 h-3" />
        Escalated
      </span>
    )
  }

  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
        <Clock className="w-3 h-3" />
        Overdue ({Math.abs(remaining)}d)
      </span>
    )
  }
  if (remaining < 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
        <Clock className="w-3 h-3" />
        {remaining}d left
      </span>
    )
  }
  if (remaining <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        <Clock className="w-3 h-3" />
        {remaining}d left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
      <Clock className="w-3 h-3" />
      {remaining}d left
    </span>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ApprovalCardProps {
  request: PendingApprovalRequest
  slaLimit: number
  viewerRole: UserRole
  onApproved: (id: string) => void
  onRejected: (id: string) => void
}

export function ApprovalCard({
  request,
  slaLimit,
  viewerRole,
  onApproved,
  onRejected,
}: ApprovalCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [showOverlaps, setShowOverlaps] = useState(false)
  const [isApproving, startApproveTransition] = useTransition()
  const [isLoadingAttachment, startAttachmentTransition] = useTransition()

  const isManagerLeave = request.user?.role === 'Manager'
  const hasOverlaps = request.overlapping_leaves.length > 0
  const dateRange =
    request.start_date === request.end_date
      ? formatDate(request.start_date)
      : `${formatDate(request.start_date)} – ${formatDate(request.end_date)}`

  function handleApprove() {
    startApproveTransition(async () => {
      const result = await approveLeaveRequest(request.id)
      if (result.success) {
        toast.success(`Leave approved for ${request.user?.full_name ?? 'employee'}.`)
        onApproved(request.id)
      } else {
        toast.error(result.error ?? 'Failed to approve request.')
      }
    })
  }

  function handleViewAttachment() {
    startAttachmentTransition(async () => {
      const result = await getAttachmentSignedUrl(request.id)
      if (result.success && result.data?.url) {
        window.open(result.data.url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error(result.error ?? 'Could not load attachment.')
      }
    })
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">

        {/* ── Header row ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar initial */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-sm shrink-0">
              {request.user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  {request.user?.full_name ?? '—'}
                </span>
                {isManagerLeave && (
                  <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700 text-[10px] px-2 py-0">
                    Manager Leave
                  </Badge>
                )}
                {request.is_backdated && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0 border-amber-300 text-amber-600 dark:text-amber-400">
                    Backdated
                  </Badge>
                )}
                {request.is_cross_year && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0 border-blue-300 text-blue-600 dark:text-blue-400">
                    Cross-year
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {request.leave_type?.name ?? '—'} · {request.duration_days ?? '—'} day{request.duration_days !== 1 ? 's' : ''}
                {request.duration_modifier !== 'Full' && (
                  <span className="ml-1 text-slate-400">({request.duration_modifier})</span>
                )}
              </p>
            </div>
          </div>

          {/* SLA badge */}
          <div className="shrink-0">
            <SlaBadge
              daysElapsed={request.sla_days_elapsed}
              slaLimit={slaLimit}
              isEscalated={!!request.escalated_at}
            />
          </div>
        </div>

        {/* ── Date range ── */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4 shrink-0 text-slate-400" />
          <span>{dateRange}</span>
        </div>

        {/* ── Reason ── */}
        {request.reason && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Reason</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {request.reason}
            </p>
          </div>
        )}

        {/* ── Attachment ── */}
        {request.attachment_url && (
          <button
            onClick={handleViewAttachment}
            disabled={isLoadingAttachment}
            className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60"
          >
            {isLoadingAttachment ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Paperclip className="w-3.5 h-3.5" />
            )}
            View Medical Certificate
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {/* ── Overlapping leaves ── */}
        {hasOverlaps && (
          <div>
            <button
              onClick={() => setShowOverlaps((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              <Users className="w-3.5 h-3.5" />
              {request.overlapping_leaves.length} colleague{request.overlapping_leaves.length !== 1 ? 's' : ''} also on leave during this period
              {showOverlaps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showOverlaps && (
              <div className="mt-2 space-y-1">
                {request.overlapping_leaves.map((o, idx) => (
                  <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-lg px-3 py-1.5">
                    <span className="font-semibold">{o.user_full_name}</span>
                    {' '} — {formatDateShort(o.start_date)} to {formatDateShort(o.end_date)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isApproving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isApproving ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Approving…</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve</>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={isApproving}
            className="flex-1 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-semibold"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Reject
          </Button>
        </div>
      </div>

      <RejectDialog
        requestId={request.id}
        employeeName={request.user?.full_name ?? 'employee'}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onSuccess={onRejected}
      />
    </>
  )
}
