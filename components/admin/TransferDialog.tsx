'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { transferEmployeeDepartment } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { Department } from '@/lib/types/app'

interface Props {
  open: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
  currentDepartmentId: string | null
  departments: Pick<Department, 'id' | 'name'>[]
  onTransferred: (newDepartmentId: string, newDepartmentName: string) => void
}

export function TransferDialog({
  open,
  onClose,
  employeeId,
  employeeName,
  currentDepartmentId,
  departments,
  onTransferred,
}: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()
  const [newDeptId, setNewDeptId] = useState('')

  function handleClose() {
    setNewDeptId('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newDeptId || newDeptId === currentDepartmentId) {
      toast.error('Please select a different department.')
      return
    }

    startTransition(async () => {
      const result = await transferEmployeeDepartment(actorId, employeeId, newDeptId)
      if (result.success) {
        const dept = departments.find((d) => d.id === newDeptId)
        toast.success(`${employeeName} transferred to ${dept?.name}.`)
        onTransferred(newDeptId, dept?.name ?? '')
        handleClose()
      } else {
        toast.error(result.error ?? 'Failed to transfer employee.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transfer Department</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Transfer <strong>{employeeName}</strong> to a new department.
          </p>
          <div className="space-y-1.5">
            <Label>New Department</Label>
            <Select value={newDeptId} onValueChange={setNewDeptId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department…" />
              </SelectTrigger>
              <SelectContent>
                {departments
                  .filter((d) => d.id !== currentDepartmentId)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending || !newDeptId} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isPending ? 'Transferring…' : 'Transfer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
