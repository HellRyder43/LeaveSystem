'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { adjustLeaveBalance } from '@/lib/actions/balance'
import { getLeaveBalance } from '@/lib/actions/balance'
import { useSession } from '@/components/providers/SessionProvider'
import type { User, LeaveTypeConfig, EffectiveLeaveBalance } from '@/lib/types/app'

interface Props {
  employees: Pick<User, 'id' | 'full_name' | 'email'>[]
  leaveTypes: Pick<LeaveTypeConfig, 'id' | 'name'>[]
}

const currentYear = new Date().getFullYear()
const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

export function BalanceAdjustmentForm({ employees, leaveTypes }: Props) {
  const { id: actorId } = useSession()
  const [isPending, startTransition] = useTransition()

  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('')
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [currentBalance, setCurrentBalance] = useState<EffectiveLeaveBalance | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  async function loadBalance(userId: string, year: number) {
    if (!userId) return
    setLoadingBalance(true)
    try {
      const result = await getLeaveBalance(userId, year)
      if (result.success && result.data) {
        const match = selectedLeaveTypeId
          ? result.data.find((b) => b.leave_type_id === selectedLeaveTypeId) ?? null
          : null
        setCurrentBalance(match)
      }
    } finally {
      setLoadingBalance(false)
    }
  }

  async function handleUserOrTypeChange(userId: string, leaveTypeId: string, year: string) {
    if (!userId || !leaveTypeId || !year) {
      setCurrentBalance(null)
      return
    }
    setLoadingBalance(true)
    try {
      const result = await getLeaveBalance(userId, parseInt(year))
      if (result.success && result.data) {
        const match = result.data.find((b) => b.leave_type_id === leaveTypeId) ?? null
        setCurrentBalance(match)
      }
    } finally {
      setLoadingBalance(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId || !selectedLeaveTypeId || !selectedYear) {
      toast.error('Please select employee, leave type, and year.')
      return
    }
    const deltaNum = parseFloat(delta)
    if (isNaN(deltaNum) || deltaNum === 0) {
      toast.error('Please enter a valid non-zero adjustment amount.')
      return
    }
    if (!reason.trim()) {
      toast.error('A reason is required for balance adjustments.')
      return
    }

    startTransition(async () => {
      const result = await adjustLeaveBalance(
        actorId,
        selectedUserId,
        selectedLeaveTypeId,
        parseInt(selectedYear),
        deltaNum,
        reason.trim()
      )

      if (result.success) {
        toast.success('Balance adjusted successfully.')
        setDelta('')
        setReason('')
        // Reload balance display
        await handleUserOrTypeChange(selectedUserId, selectedLeaveTypeId, selectedYear)
      } else {
        toast.error(result.error ?? 'Failed to adjust balance.')
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Employee */}
        <div className="space-y-1.5">
          <Label>Employee</Label>
          <Select
            value={selectedUserId}
            onValueChange={(v) => {
              setSelectedUserId(v)
              handleUserOrTypeChange(v, selectedLeaveTypeId, selectedYear)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee…" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name} <span className="text-slate-400 text-xs ml-1">({emp.email})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leave Type */}
        <div className="space-y-1.5">
          <Label>Leave Type</Label>
          <Select
            value={selectedLeaveTypeId}
            onValueChange={(v) => {
              setSelectedLeaveTypeId(v)
              handleUserOrTypeChange(selectedUserId, v, selectedYear)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select leave type…" />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map((lt) => (
                <SelectItem key={lt.id} value={lt.id}>
                  {lt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select
            value={selectedYear}
            onValueChange={(v) => {
              setSelectedYear(v)
              handleUserOrTypeChange(selectedUserId, selectedLeaveTypeId, v)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Balance */}
        {(loadingBalance || currentBalance) && (
          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Current Balance</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingBalance ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : currentBalance ? (
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Allocated: <strong>{currentBalance.allocated}</strong></span>
                  <span className="text-slate-600 dark:text-slate-400">Carry-Fwd: <strong>{currentBalance.carried_forward}</strong></span>
                  <span className="text-slate-600 dark:text-slate-400">Used: <strong>{currentBalance.used}</strong></span>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20">
                    Effective: {currentBalance.effective_balance}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No balance record found for this combination.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delta */}
        <div className="space-y-1.5">
          <Label>Adjustment Amount</Label>
          <Input
            type="number"
            step="0.5"
            placeholder="e.g. +2 or -1"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <p className="text-xs text-slate-500">Positive to add days, negative to deduct. Adjusts the <em>allocated</em> field.</p>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <Label>
            Reason <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            placeholder="Mandatory reason for this adjustment (visible in audit log)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          type="submit"
          disabled={isPending || !selectedUserId || !selectedLeaveTypeId || !selectedYear || !delta || !reason.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isPending ? 'Adjusting…' : 'Apply Adjustment'}
        </Button>
      </form>
    </div>
  )
}
