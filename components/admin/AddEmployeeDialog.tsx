'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Copy, Check, UserCheck } from 'lucide-react'
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

const EMPTY_FORM: NewEmployeeFormData = {
  full_name: '',
  email: '',
  department_id: '',
  role: 'Employee',
  join_date: '',
}

export function AddEmployeeDialog({ open, onClose, departments, onCreated }: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<NewEmployeeFormData>(EMPTY_FORM)
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setForm(EMPTY_FORM)
    setCredentials(null)
    setCopied(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function copyPassword(password: string) {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
        onCreated({ ...result.data, department_name: dept?.name ?? null })
        setCredentials({
          name: form.full_name,
          email: form.email,
          password: result.data.temp_password,
        })
      } else {
        toast.error(result.error ?? 'Failed to create employee.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-500" />
                Employee Created
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-slate-600">
                <span className="font-medium">{credentials.name}</span> has been added successfully.
                Share the temporary credentials below with them — they can change their password after logging in.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm font-mono text-slate-800">{credentials.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Temporary Password</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-slate-800 flex-1">{credentials.password}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => copyPassword(credentials.password)}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                This password is only shown once. Make sure to share it with the employee before closing this dialog.
              </p>
              <div className="flex justify-end">
                <Button onClick={handleClose} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Done
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
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
                <p className="text-xs text-slate-500">A temporary password will be generated for first login.</p>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
