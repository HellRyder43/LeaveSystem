'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cancelLeaveRequest, cancelApprovedLeave } from '@/lib/actions/leave'
import type { LeaveRequestWithDetails, LeaveStatus } from '@/lib/types/app'

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Escalated: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface LeaveHistoryTableProps {
  requests: LeaveRequestWithDetails[]
  total: number
  page: number
  pageSize: number
  currentYear: number
  currentStatus: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LeaveHistoryTable({
  requests,
  total,
  page,
  pageSize,
  currentYear,
  currentStatus,
}: LeaveHistoryTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const today = getTodayStr()

  // Build a new URL with updated search params
  function buildUrl(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)))
    return `${pathname}?${params.toString()}`
  }

  function handleYearChange(year: string) {
    router.push(buildUrl({ year, page: 1 }))
  }

  function handleStatusChange(status: string) {
    router.push(buildUrl({ status, page: 1 }))
  }

  // ─── Cancel pending ───────────────────────────────────────────────────────

  function handleCancelPending(requestId: string) {
    startTransition(async () => {
      const result = await cancelLeaveRequest(requestId)
      if (result.success) {
        toast.success('Leave request cancelled.')
      } else {
        toast.error(result.error ?? 'Failed to cancel request.')
      }
    })
  }

  // ─── Cancel approved ─────────────────────────────────────────────────────

  function handleCancelApproved(requestId: string) {
    startTransition(async () => {
      const result = await cancelApprovedLeave(requestId)
      if (result.success) {
        toast.success('Approved leave cancelled and balance restored.')
      } else {
        toast.error(result.error ?? 'Failed to cancel leave.')
      }
    })
  }

  // ─── Year options ─────────────────────────────────────────────────────────

  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2].filter(
    (y) => y > 2020
  )

  const statusOptions = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled']

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Year
          </label>
          <select
            value={currentYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Status
          </label>
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-400 dark:text-slate-500 self-center">
          {total} record{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">No leave requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Dates</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Duration</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide hidden md:table-cell">Comment</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {requests.map((req) => {
                  const leaveTypeName = (req.leave_type as { name?: string } | undefined)?.name ?? '—'
                  const status = req.status as LeaveStatus
                  const sameDay = req.start_date === req.end_date
                  const dateLabel = sameDay
                    ? formatDate(req.start_date)
                    : `${formatDate(req.start_date)} – ${formatDate(req.end_date)}`
                  const durationLabel = req.duration_modifier !== 'Full'
                    ? `${req.duration_modifier} (0.5d)`
                    : `${req.duration_days}d`
                  const approverComment = (req as LeaveRequestWithDetails).approver_comment

                  // Cancel button logic
                  const canCancelPending = status === 'Pending'
                  const canCancelApproved = status === 'Approved' && req.start_date > today

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {leaveTypeName}
                        {req.is_backdated && (
                          <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">(backdated)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{dateLabel}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{durationLabel}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.Cancelled}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 max-w-[200px] truncate hidden md:table-cell">
                        {approverComment ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {canCancelPending && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={isPending}
                                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Leave Request?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will cancel your pending {leaveTypeName} request for{' '}
                                  <span className="font-semibold">{dateLabel}</span>.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Request</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelPending(req.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white"
                                >
                                  Yes, Cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {canCancelApproved && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={isPending}
                                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
                              >
                                Cancel Leave
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Approved Leave?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will cancel your approved {leaveTypeName} leave for{' '}
                                  <span className="font-semibold">{dateLabel}</span>{' '}
                                  and restore your balance. This can only be done at least 1 working day before the start date.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Leave</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelApproved(req.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white"
                                >
                                  Yes, Cancel Leave
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400 dark:text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <a
              href={page > 1 ? buildUrl({ page: page - 1 }) : '#'}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                page <= 1
                  ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 pointer-events-none'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Previous
            </a>
            <a
              href={page < totalPages ? buildUrl({ page: page + 1 }) : '#'}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                page >= totalPages
                  ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 pointer-events-none'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Next
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
