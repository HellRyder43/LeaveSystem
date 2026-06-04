'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Search, ArrowRightLeft, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { AddEmployeeDialog } from './AddEmployeeDialog'
import { TransferDialog } from './TransferDialog'
import { deactivateEmployee } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { User, Department } from '@/lib/types/app'

type EmployeeRow = User & { department_name: string | null }

interface Props {
  initialEmployees: EmployeeRow[]
  departments: Pick<Department, 'id' | 'name'>[]
}

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
  Manager: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  Employee: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
}

export function EmployeeTable({ initialEmployees, departments }: Props) {
  const { id: actorId } = useSession()
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<EmployeeRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = employees.filter((emp) => {
    const matchSearch =
      !search ||
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'all' || emp.department_id === deptFilter
    return matchSearch && matchDept
  })

  function handleDeactivate() {
    if (!deactivateTarget) return
    startTransition(async () => {
      const result = await deactivateEmployee(actorId, deactivateTarget.id)
      if (result.success) {
        setEmployees((prev) => prev.map((e) =>
          e.id === deactivateTarget.id ? { ...e, is_active: false } : e
        ))
        toast.success(`${deactivateTarget.full_name} deactivated.`)
      } else {
        toast.error(result.error ?? 'Failed to deactivate employee.')
      }
      setDeactivateTarget(null)
    })
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-MY', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No employees match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Join Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{emp.full_name}</p>
                      <p className="text-xs text-slate-500 sm:hidden">{emp.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell text-xs">{emp.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${ROLE_COLORS[emp.role] ?? ''}`}>
                        {emp.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs hidden md:table-cell">
                      {emp.department_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {formatDate(emp.join_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.is_active ? (
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
                          onClick={() => setTransferTarget(emp)}
                          title="Transfer department"
                          disabled={!emp.is_active}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeactivateTarget(emp)}
                          title="Deactivate"
                          disabled={!emp.is_active}
                        >
                          <UserX className="w-3.5 h-3.5" />
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

      {/* Dialogs */}
      <AddEmployeeDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        departments={departments}
        onCreated={(emp) => setEmployees((prev) => [emp, ...prev])}
      />

      {transferTarget && (
        <TransferDialog
          open={!!transferTarget}
          onClose={() => setTransferTarget(null)}
          employeeId={transferTarget.id}
          employeeName={transferTarget.full_name}
          currentDepartmentId={transferTarget.department_id}
          departments={departments}
          onTransferred={(newDeptId, newDeptName) => {
            setEmployees((prev) =>
              prev.map((e) =>
                e.id === transferTarget.id
                  ? { ...e, department_id: newDeptId, department_name: newDeptName }
                  : e
              )
            )
            setTransferTarget(null)
          }}
        />
      )}

      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivateTarget?.full_name}</strong>?
              They will lose access to the system. Their leave history and balances are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
