'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateSystemSettings } from '@/lib/actions/admin'
import { useSession } from '@/components/providers/SessionProvider'
import type { SystemSettings, SettingsFormData } from '@/lib/types/app'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

interface Props {
  settings: SystemSettings
}

export function PolicySettingsForm({ settings }: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<SettingsFormData>({
    approval_sla_days: settings.approval_sla_days,
    backdated_leave_window_days: settings.backdated_leave_window_days,
    carry_forward_expiry_month: settings.carry_forward_expiry_month,
    encashment_enabled: settings.encashment_enabled,
    leave_year_start_month: settings.leave_year_start_month,
    entitlement_tier_lt2: settings.entitlement_tier_lt2,
    entitlement_tier_2to5: settings.entitlement_tier_2to5,
    entitlement_tier_gt5: settings.entitlement_tier_gt5,
  })

  function setNum(field: keyof SettingsFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: parseInt(value) || 0 }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateSystemSettings(actorId, form)
      if (result.success) {
        toast.success('Policy settings saved.')
      } else {
        toast.error(result.error ?? 'Failed to save settings.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Entitlement Tiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Annual Leave Entitlement Tiers</CardTitle>
          <p className="text-xs text-slate-500">Days per year based on years of service.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Less than 2 years</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={form.entitlement_tier_lt2}
                  onChange={(e) => setNum('entitlement_tier_lt2', e.target.value)}
                  className="h-8"
                />
                <span className="text-xs text-slate-400 shrink-0">days</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">2 – 5 years</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={form.entitlement_tier_2to5}
                  onChange={(e) => setNum('entitlement_tier_2to5', e.target.value)}
                  className="h-8"
                />
                <span className="text-xs text-slate-400 shrink-0">days</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">More than 5 years</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={form.entitlement_tier_gt5}
                  onChange={(e) => setNum('entitlement_tier_gt5', e.target.value)}
                  className="h-8"
                />
                <span className="text-xs text-slate-400 shrink-0">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Approval & Leave Windows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Approval SLA Days</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.approval_sla_days}
                  onChange={(e) => setNum('approval_sla_days', e.target.value)}
                />
                <span className="text-xs text-slate-400 shrink-0">working days</span>
              </div>
              <p className="text-xs text-slate-500">Managers must act within this many working days before escalation.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Backdated Leave Window</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={form.backdated_leave_window_days}
                  onChange={(e) => setNum('backdated_leave_window_days', e.target.value)}
                />
                <span className="text-xs text-slate-400 shrink-0">calendar days</span>
              </div>
              <p className="text-xs text-slate-500">Maximum days in the past an employee can apply for leave.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year & Carry Forward */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leave Year & Carry Forward</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Leave Year Start Month</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.leave_year_start_month}
                onChange={(e) => setNum('leave_year_start_month', e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Carry Forward Expiry Month</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={form.carry_forward_expiry_month}
                onChange={(e) => setNum('carry_forward_expiry_month', e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Carried-forward days expire on the 1st of this month.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encashment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Year-End Encashment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="encashment"
              checked={form.encashment_enabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, encashment_enabled: checked }))}
            />
            <Label htmlFor="encashment">
              Enable leave encashment for unused Annual Leave beyond carry-forward cap
            </Label>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            When enabled, forfeited days are recorded in the encashment log for payroll reference.
          </p>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isPending}
        className="bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isPending ? 'Saving…' : 'Save Policy Settings'}
      </Button>
    </form>
  )
}
