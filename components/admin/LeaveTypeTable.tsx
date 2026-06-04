'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { LeaveTypeDialog } from './LeaveTypeDialog'
import { updateLeaveType } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { LeaveTypeConfig } from '@/lib/types/app'

interface Props {
  initialLeaveTypes: LeaveTypeConfig[]
}

export function LeaveTypeTable({ initialLeaveTypes }: Props) {
  const { id: actorId } = useSession()
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeConfig[]>(initialLeaveTypes)
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LeaveTypeConfig | null>(null)

  const displayed = showInactive ? leaveTypes : leaveTypes.filter((lt) => lt.is_active)

  function handleEdit(lt: LeaveTypeConfig) {
    setEditTarget(lt)
    setDialogOpen(true)
  }

  function handleAdd() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function handleSaved(updated: LeaveTypeConfig) {
    setLeaveTypes((prev) => {
      const existing = prev.find((lt) => lt.id === updated.id)
      if (existing) {
        return prev.map((lt) => (lt.id === updated.id ? updated : lt))
      }
      return [updated, ...prev]
    })
  }

  async function toggleActive(lt: LeaveTypeConfig) {
    const result = await updateLeaveType(actorId, lt.id, { is_active: !lt.is_active })
    if (result.success && result.data) {
      setLeaveTypes((prev) => prev.map((l) => (l.id === lt.id ? result.data! : l)))
      toast.success(`"${lt.name}" ${result.data.is_active ? 'activated' : 'deactivated'}.`)
    } else {
      toast.error(result.error ?? 'Failed to update leave type.')
    }
  }

  function check(val: boolean) {
    return val ? (
      <span className="text-emerald-600 font-semibold text-sm">✓</span>
    ) : (
      <span className="text-slate-300 text-sm">—</span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
            className="scale-90"
          />
          <label htmlFor="show-inactive" className="cursor-pointer">Show inactive types</label>
        </div>
        <Button onClick={handleAdd} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
          <Plus className="w-4 h-4" />
          Add Leave Type
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No leave types found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quota</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Half-Day</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Carry-Fwd</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">MC Req.</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Gender</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((lt) => (
                  <tr key={lt.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{lt.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lt.default_quota}d</td>
                    <td className="px-4 py-3 text-center">{check(lt.allow_half_day)}</td>
                    <td className="px-4 py-3 text-center">
                      {lt.is_carry_forward_allowed
                        ? <span className="text-emerald-600 text-sm font-semibold">✓ {lt.max_carry_forward_days}d</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lt.requires_attachment
                        ? <span className="text-amber-600 text-sm font-semibold">✓ &gt;{lt.attachment_required_after_days}d</span>
                        : <span className="text-slate-300 text-sm">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">{check(lt.is_paid)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{lt.gender_restriction}</td>
                    <td className="px-4 py-3 text-center">
                      {lt.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 text-xs">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEdit(lt)}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => toggleActive(lt)}
                          title={lt.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {lt.is_active
                            ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                            : <ToggleLeft className="w-4 h-4 text-slate-400" />
                          }
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LeaveTypeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editTarget={editTarget}
        onSaved={handleSaved}
      />
    </div>
  )
}
