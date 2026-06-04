'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createEmployee } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { User, Department, NewEmployeeFormData } from '@/lib/types/app'

interface Props {
  open: boolean
  onClose: () => void
  departments: Pick<Department, 'id' | 'name'>[]
  onCreated: (user: User & { department_name: string | null }) => void
}

export function AddEmployeeDialog({ open, onClose, departments, onCreated }: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<NewEmployeeFormData>({
    full_name: '',
    email: '',
    department_id: '',
    role: 'Employee',
    join_date: '',
  })

  function reset() {
    setForm({ full_name: '', email: '', department_id: '', role: 'Employee', join_date: '' })
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error('Full name is required.'); return }
    if (!form.email.trim()) { toast.error('Email is required.'); return }
    if (!form.department_id) { toast.error('Department is required.'); return }
    if (!form.join_date) { toast.error('Join date is required.'); return }

    startTransition(async () => {
      const result = await createEmployee(actorId, form)
      if (result.success && result.data) {
        const dept = departments.find((d) => d.id === form.department_id)
        toast.success(`${form.full_name} created. A password reset link has been sent to ${form.email}.`)
        onCreated({ ...result.data, department_name: dept?.name ?? null })
        handleClose()
      } else {
        toast.error(result.error ?? 'Failed to create employee.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Full Name <span className="text-rose-500">*</span></Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="e.g. Ahmad Faris"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-rose-500">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="e.g. ahmad.faris@company.com"
            />
            <p className="text-xs text-slate-500">A password reset email will be sent to this address.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department <span className="text-rose-500">*</span></Label>
              <Select
                value={form.department_id}
                onValueChange={(v) => setForm((p) => ({ ...p, department_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v as 'Employee' | 'Manager' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Join Date <span className="text-rose-500">*</span></Label>
            <Input
              type="date"
              value={form.join_date}
              onChange={(e) => setForm((p) => ({ ...p, join_date: e.target.value }))}
            />
            <p className="text-xs text-slate-500">Used to calculate prorated Annual Leave balance.</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isPending ? 'Creating…' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
