'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Upload, Trash2, Globe, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { AddHolidayDialog } from './AddHolidayDialog'
import { BulkImportDialog } from './BulkImportDialog'
import { deletePublicHoliday, getPublicHolidays } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { PublicHoliday, Department } from '@/lib/types/app'

type HolidayWithDept = PublicHoliday & { department_name: string | null }

interface Props {
  initialHolidays: HolidayWithDept[]
  departments: Pick<Department, 'id' | 'name'>[]
  currentYear: number
}

export function HolidayTable({ initialHolidays, departments, currentYear }: Props) {
  const { id: actorId } = useSession()
  const [holidays, setHolidays] = useState<HolidayWithDept[]>(initialHolidays)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<HolidayWithDept | null>(null)
  const [isPending, startTransition] = useTransition()

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  async function loadYear(year: number) {
    setSelectedYear(year)
    startTransition(async () => {
      const result = await getPublicHolidays(year)
      if (result.success) {
        setHolidays(result.data ?? [])
      } else {
        toast.error(result.error ?? 'Failed to load holidays.')
      }
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deletePublicHoliday(actorId, deleteTarget.id)
      if (result.success) {
        setHolidays((prev) => prev.filter((h) => h.id !== deleteTarget.id))
        toast.success(`"${deleteTarget.name}" deleted.`)
      } else {
        toast.error(result.error ?? 'Failed to delete holiday.')
      }
      setDeleteTarget(null)
    })
  }

  async function handleImported() {
    // Reload current year after bulk import
    const result = await getPublicHolidays(selectedYear)
    if (result.success) {
      setHolidays(result.data ?? [])
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Year:</span>
          <div className="flex gap-1">
            {yearOptions.map((y) => (
              <Button
                key={y}
                size="sm"
                variant={selectedYear === y ? 'default' : 'outline'}
                className={selectedYear === y ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                onClick={() => loadYear(y)}
                disabled={isPending}
              >
                {y}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="gap-1"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {holidays.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No holidays for {selectedYear}. Add one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((h) => (
                    <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{h.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(h.date)}</td>
                      <td className="px-4 py-3">
                        {h.department_id ? (
                          <Badge variant="outline" className="gap-1 text-xs text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
                            <Building2 className="w-3 h-3" />
                            {h.department_name ?? 'Department'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400">
                            <Globe className="w-3 h-3" />
                            Global
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget(h)}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddHolidayDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        departments={departments}
        onSaved={(h) => setHolidays((prev) => [h, ...prev])}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={handleImported}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
