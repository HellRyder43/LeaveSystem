'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAuditLog } from '@/lib/actions/admin'
import type { AuditLogEntry, AuditLogFilters } from '@/lib/types/app'

const PAGE_SIZE = 50

interface Props {
  initialEntries: AuditLogEntry[]
  initialTotal: number
  actorOptions: { id: string; full_name: string }[]
  actionOptions: string[]
}

function JsonCell({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false)
  const str = JSON.stringify(value, null, 2)
  if (!value || str === '{}' || str === 'null') {
    return <span className="text-slate-400 text-xs">—</span>
  }
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
    >
      {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      {open ? 'Hide' : 'View'}
      {open && (
        <pre className="mt-2 p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono max-w-xs overflow-auto whitespace-pre-wrap text-left">
          {str}
        </pre>
      )}
    </button>
  )
}

export function AuditLogTable({ initialEntries, initialTotal, actorOptions, actionOptions }: Props) {
  const [entries, setEntries] = useState<AuditLogEntry[]>(initialEntries)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const [filterActorId, setFilterActorId] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function applyFilters(newPage = 1) {
    const filters: AuditLogFilters = {
      actor_id: filterActorId || undefined,
      action_type: filterAction || undefined,
      from_date: filterFrom || undefined,
      to_date: filterTo || undefined,
    }

    startTransition(async () => {
      const result = await getAuditLog(filters, newPage)
      if (result.success && result.data) {
        setEntries(result.data.entries)
        setTotal(result.data.total)
        setPage(newPage)
      } else {
        toast.error(result.error ?? 'Failed to load audit log.')
      }
    })
  }

  function handlePageChange(newPage: number) {
    applyFilters(newPage)
  }

  function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Actor</Label>
            <Select value={filterActorId} onValueChange={setFilterActorId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All actors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actors</SelectItem>
                {actorOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => applyFilters(1)} disabled={isPending} className="bg-slate-800 dark:bg-slate-200 dark:text-slate-900 text-white">
            {isPending ? 'Loading…' : 'Apply Filters'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFilterActorId('')
              setFilterAction('')
              setFilterFrom('')
              setFilterTo('')
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500">
        Showing {entries.length} of {total} entries
      </p>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No audit log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Before</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">After</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatTimestamp(entry.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {entry.actor_name ?? <span className="text-slate-400">System</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {entry.action === 'ADJUST_BALANCE' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                          {entry.action}
                        </Badge>
                      ) : (
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{entry.action}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span className="font-mono">{entry.target_table}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {entry.reason ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <JsonCell value={entry.before_state} />
                    </td>
                    <td className="px-4 py-3">
                      <JsonCell value={entry.after_state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
          >
            Previous
          </Button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
