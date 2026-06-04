'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLeaveType, updateLeaveType } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { LeaveTypeConfig, LeaveTypeFormData, GenderRestriction } from '@/lib/types/app'

interface Props {
  open: boolean
  onClose: () => void
  editTarget?: LeaveTypeConfig | null
  onSaved: (lt: LeaveTypeConfig) => void
}

const defaultForm: LeaveTypeFormData = {
  name: '',
  default_quota: 14,
  allow_half_day: false,
  is_carry_forward_allowed: false,
  max_carry_forward_days: 0,
  requires_attachment: false,
  attachment_required_after_days: 1,
  gender_restriction: 'None',
  is_paid: true,
  is_active: true,
}

function getInitialForm(editTarget?: LeaveTypeConfig | null): LeaveTypeFormData {
  if (!editTarget) return defaultForm
  return {
    name: editTarget.name,
    default_quota: editTarget.default_quota,
    allow_half_day: editTarget.allow_half_day,
    is_carry_forward_allowed: editTarget.is_carry_forward_allowed,
    max_carry_forward_days: editTarget.max_carry_forward_days,
    requires_attachment: editTarget.requires_attachment,
    attachment_required_after_days: editTarget.attachment_required_after_days,
    gender_restriction: editTarget.gender_restriction,
    is_paid: editTarget.is_paid,
    is_active: editTarget.is_active,
  }
}

function LeaveTypeDialogInner({ open, onClose, editTarget, onSaved }: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<LeaveTypeFormData>(() => getInitialForm(editTarget))

  function setField<K extends keyof LeaveTypeFormData>(key: K, value: LeaveTypeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Leave type name is required.')
      return
    }

    startTransition(async () => {
      let result
      if (editTarget) {
        result = await updateLeaveType(actorId, editTarget.id, form)
      } else {
        result = await createLeaveType(actorId, form)
      }

      if (result.success && result.data) {
        toast.success(editTarget ? 'Leave type updated.' : 'Leave type created.')
        onSaved(result.data)
        onClose()
      } else {
        toast.error(result.error ?? 'Failed to save leave type.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Name <span className="text-rose-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Annual Leave" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default Quota (days)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={form.default_quota}
                onChange={(e) => setField('default_quota', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender Restriction</Label>
              <Select
                value={form.gender_restriction}
                onValueChange={(v) => setField('gender_restriction', v as GenderRestriction)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Male">Male only</SelectItem>
                  <SelectItem value="Female">Female only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow_half_day" className="cursor-pointer">Allow Half-Day</Label>
              <Switch
                id="allow_half_day"
                checked={form.allow_half_day}
                onCheckedChange={(v) => setField('allow_half_day', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_paid" className="cursor-pointer">Paid Leave</Label>
              <Switch
                id="is_paid"
                checked={form.is_paid}
                onCheckedChange={(v) => setField('is_paid', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_carry_forward_allowed" className="cursor-pointer">Allow Carry Forward</Label>
              <Switch
                id="is_carry_forward_allowed"
                checked={form.is_carry_forward_allowed}
                onCheckedChange={(v) => setField('is_carry_forward_allowed', v)}
              />
            </div>
          </div>

          {form.is_carry_forward_allowed && (
            <div className="space-y-1.5">
              <Label>Max Carry Forward Days</Label>
              <Input
                type="number"
                min={0}
                value={form.max_carry_forward_days}
                onChange={(e) => setField('max_carry_forward_days', parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="requires_attachment" className="cursor-pointer">Requires Attachment</Label>
            <Switch
              id="requires_attachment"
              checked={form.requires_attachment}
              onCheckedChange={(v) => setField('requires_attachment', v)}
            />
          </div>

          {form.requires_attachment && (
            <div className="space-y-1.5">
              <Label>Attachment Required After N Days</Label>
              <Input
                type="number"
                min={0}
                value={form.attachment_required_after_days}
                onChange={(e) => setField('attachment_required_after_days', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-slate-500">e.g. 1 = required if leave is longer than 1 day.</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(v) => setField('is_active', v)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isPending ? 'Saving…' : editTarget ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Wrapper: key forces remount of inner component when editTarget changes, resetting form state
export function LeaveTypeDialog(props: Props) {
  return <LeaveTypeDialogInner key={props.editTarget?.id ?? 'new'} {...props} />
}
