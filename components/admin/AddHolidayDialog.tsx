'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addPublicHoliday } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { PublicHoliday, Department, HolidayFormData } from '@/lib/types/app'

interface Props {
  open: boolean
  onClose: () => void
  departments: Pick<Department, 'id' | 'name'>[]
  onSaved: (holiday: PublicHoliday & { department_name: string | null }) => void
}

export function AddHolidayDialog({ open, onClose, departments, onSaved }: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [departmentId, setDepartmentId] = useState('global')

  function reset() {
    setName('')
    setDate('')
    setDepartmentId('global')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Holiday name is required.'); return }
    if (!date) { toast.error('Holiday date is required.'); return }

    const data: HolidayFormData = {
      name: name.trim(),
      date,
      department_id: departmentId === 'global' ? undefined : departmentId,
    }

    startTransition(async () => {
      const result = await addPublicHoliday(actorId, data)
      if (result.success && result.data) {
        const dept = departments.find((d) => d.id === departmentId)
        toast.success('Holiday added.')
        onSaved({ ...result.data, department_name: dept?.name ?? null })
        handleClose()
      } else {
        toast.error(result.error ?? 'Failed to add holiday.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Public Holiday</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Holiday Name <span className="text-rose-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. National Day" />
          </div>
          <div className="space-y-1.5">
            <Label>Date <span className="text-rose-500">*</span></Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Applicability</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Global (all departments)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (all departments)</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? 'Adding…' : 'Add Holiday'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
