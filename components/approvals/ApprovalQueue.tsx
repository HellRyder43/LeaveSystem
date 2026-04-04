'use client'

import { useState } from 'react'
import { CheckSquare, Inbox, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApprovalCard } from './ApprovalCard'
import { BulkApproveDialog } from './BulkApproveDialog'
import type { PendingApprovalRequest } from '@/lib/actions/approvals'
import type { UserRole } from '@/lib/types/app'

interface ApprovalQueueProps {
  initialRequests: PendingApprovalRequest[]
  slaLimitDays: number
  viewerRole: UserRole
}

export function ApprovalQueue({
  initialRequests,
  slaLimitDays,
  viewerRole,
}: ApprovalQueueProps) {
  const [requests, setRequests] = useState<PendingApprovalRequest[]>(initialRequests)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Remove a request from the queue after it's been acted on
  function removeRequest(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function handleBulkSuccess(approvedIds: string[]) {
    approvedIds.forEach(removeRequest)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r.id)))
    }
  }

  // Filter by search query (employee name or leave type)
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      r.user?.full_name?.toLowerCase().includes(q) ||
      r.leave_type?.name?.toLowerCase().includes(q)
    )
  })

  const selectedRequests = filteredRequests.filter((r) => selectedIds.has(r.id))

  const escalatedCount = requests.filter((r) => r.escalated_at).length
  const overdueCount = requests.filter((r) => slaLimitDays - r.sla_days_elapsed <= 0).length

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">All caught up!</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">No pending leave requests to review.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Stats bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2">
          <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{requests.length}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">pending</span>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{overdueCount}</span>
            <span className="text-xs text-rose-500 dark:text-rose-400 font-medium">overdue</span>
          </div>
        )}
        {escalatedCount > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-2">
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">{escalatedCount}</span>
            <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">escalated</span>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or leave type…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
          />
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleSelectAll}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors px-2 py-2"
          >
            {selectedIds.size === filteredRequests.length && filteredRequests.length > 0
              ? 'Deselect all'
              : 'Select all'}
          </button>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={() => setBulkDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              <CheckSquare className="w-4 h-4" />
              Approve {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      {/* ── Cards grid ── */}
      {filteredRequests.length === 0 ? (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-12">
          No requests match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRequests.map((req) => (
            <div key={req.id} className="relative">
              {/* Selection checkbox overlay */}
              <div className="absolute top-3 right-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(req.id)}
                  onChange={() => toggleSelect(req.id)}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                  aria-label={`Select ${req.user?.full_name ?? 'request'}`}
                />
              </div>
              <ApprovalCard
                request={req}
                slaLimit={slaLimitDays}
                viewerRole={viewerRole}
                onApproved={removeRequest}
                onRejected={removeRequest}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bulk approve dialog */}
      <BulkApproveDialog
        selectedRequests={selectedRequests}
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={handleBulkSuccess}
      />
    </div>
  )
}
