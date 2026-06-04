'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Download, BarChart3, Users, DollarSign, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  getLeaveUtilizationReport,
  getHeadcountOnLeaveReport,
  getLeaveLiabilityReport,
  getLeaveTrend,
  exportPayrollCSV,
} from '@/lib/actions/reports'
import type { Department, LeaveTypeConfig, UtilizationRow, HeadcountRow, LiabilityRow, TrendDataPoint } from '@/lib/types/app'

interface Props {
  departments: Pick<Department, 'id' | 'name'>[]
  leaveTypes: Pick<LeaveTypeConfig, 'id' | 'name'>[]
}

const currentYear = new Date().getFullYear()
const yearOptions = [currentYear - 2, currentYear - 1, currentYear]

// ─── Utilization Tab ──────────────────────────────────────────────
function UtilizationTab({ departments, leaveTypes }: Props) {
  const [isPending, startTransition] = useTransition()
  const [year, setYear] = useState(String(currentYear))
  const [deptId, setDeptId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [rows, setRows] = useState<UtilizationRow[]>([])
  const [ran, setRan] = useState(false)

  function handleRun() {
    startTransition(async () => {
      const result = await getLeaveUtilizationReport(
        parseInt(year),
        deptId || undefined,
        leaveTypeId || undefined,
      )
      if (result.success) {
        setRows(result.data ?? [])
        setRan(true)
      } else {
        toast.error(result.error ?? 'Failed to run report.')
      }
    })
  }

  function handleExport() {
    const month = new Date().getMonth() + 1
    startTransition(async () => {
      const result = await exportPayrollCSV(month, parseInt(year))
      if (result.success && result.data) {
        const blob = new Blob([result.data.csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll_${year}_${String(month).padStart(2, '0')}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded.')
      } else {
        toast.error(result.error ?? 'Failed to export CSV.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Department</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Leave Type</Label>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {leaveTypes.map((lt) => (
                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleRun} disabled={isPending} className="bg-rose-600 hover:bg-rose-700 text-white h-8">
          {isPending ? 'Running…' : 'Run Report'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={isPending} className="h-8 gap-1">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {ran && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No data found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Department</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Allocated</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Used</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-medium">{r.full_name}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs hidden md:table-cell">{r.department_name}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-xs">{r.leave_type_name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{r.days_allocated}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{r.days_used}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={r.days_remaining < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                          {r.days_remaining}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Headcount Tab ────────────────────────────────────────────────
function HeadcountTab() {
  const [isPending, startTransition] = useTransition()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState<HeadcountRow[]>([])
  const [ran, setRan] = useState(false)

  function handleRun() {
    if (!startDate || !endDate) { toast.error('Please select a date range.'); return }
    if (startDate > endDate) { toast.error('Start date must be before end date.'); return }
    startTransition(async () => {
      const result = await getHeadcountOnLeaveReport(startDate, endDate)
      if (result.success) {
        setRows(result.data ?? [])
        setRan(true)
      } else {
        toast.error(result.error ?? 'Failed to run report.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <Button size="sm" onClick={handleRun} disabled={isPending} className="bg-rose-600 hover:bg-rose-700 text-white h-8">
          {isPending ? 'Running…' : 'Run Report'}
        </Button>
      </div>

      {ran && (
        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No approved leaves in this date range.
            </div>
          ) : rows.map((row) => (
            <div key={row.date} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{row.date}</span>
                <Badge variant="outline" className="text-xs">{row.employees.length} on leave</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.employees.map((emp, i) => (
                  <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300">
                    {emp.full_name} <span className="text-slate-400">· {emp.leave_type_name}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Liability Tab ────────────────────────────────────────────────
function LiabilityTab() {
  const [isPending, startTransition] = useTransition()
  const [year, setYear] = useState(String(currentYear))
  const [defaultRate, setDefaultRate] = useState('')
  const [rows, setRows] = useState<LiabilityRow[]>([])
  const [ran, setRan] = useState(false)

  function handleRun() {
    const rate = parseFloat(defaultRate) || 0
    startTransition(async () => {
      const result = await getLeaveLiabilityReport(parseInt(year), {})
      if (result.success && result.data) {
        // Apply default rate to all rows that don't have a rate
        const withRate = result.data.map((r) => ({
          ...r,
          daily_rate: rate,
          liability: r.unused_days * rate,
        }))
        setRows(withRate)
        setRan(true)
      } else {
        toast.error(result.error ?? 'Failed to run report.')
      }
    })
  }

  const totalLiability = rows.reduce((sum, r) => sum + r.liability, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Daily Rate (MYR)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="e.g. 250.00"
            value={defaultRate}
            onChange={(e) => setDefaultRate(e.target.value)}
            className="h-8 text-xs w-36"
          />
        </div>
        <Button size="sm" onClick={handleRun} disabled={isPending} className="bg-rose-600 hover:bg-rose-700 text-white h-8">
          {isPending ? 'Running…' : 'Run Report'}
        </Button>
      </div>

      {ran && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No data found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Department</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unused Days</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Daily Rate</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Liability (MYR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{r.full_name}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs hidden md:table-cell">{r.department_name}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-xs">{r.leave_type_name}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{r.unused_days}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                          {r.daily_rate > 0 ? `MYR ${r.daily_rate.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {r.daily_rate > 0 ? `MYR ${r.liability.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totalLiability > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <td colSpan={5} className="px-4 py-2.5 text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                          Total Liability
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-800 dark:text-slate-100">
                          MYR {totalLiability.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Trend Tab ────────────────────────────────────────────────────
function TrendTab() {
  const [isPending, startTransition] = useTransition()
  const [year, setYear] = useState(String(currentYear))
  const [data, setData] = useState<TrendDataPoint[]>([])
  const [ran, setRan] = useState(false)

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  function handleRun() {
    startTransition(async () => {
      const result = await getLeaveTrend(parseInt(year))
      if (result.success) {
        setData(result.data ?? [])
        setRan(true)
      } else {
        toast.error(result.error ?? 'Failed to load trend data.')
      }
    })
  }

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count), 1) : 1

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleRun} disabled={isPending} className="bg-rose-600 hover:bg-rose-700 text-white h-8">
          {isPending ? 'Running…' : 'Run Report'}
        </Button>
      </div>

      {ran && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Monthly Leave Applications — {year}
          </p>
          <div className="flex items-end gap-2 h-48">
            {data.map((d, i) => {
              const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500 font-medium">{d.count > 0 ? d.count : ''}</span>
                  <div className="w-full rounded-t-md bg-rose-500 dark:bg-rose-600 transition-all duration-300" style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 0)}%` }} />
                  <span className="text-xs text-slate-400">{MONTH_LABELS[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────
export function ReportsPage({ departments, leaveTypes }: Props) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="utilization">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="utilization" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Utilization
          </TabsTrigger>
          <TabsTrigger value="headcount" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            Headcount
          </TabsTrigger>
          <TabsTrigger value="liability" className="gap-1.5 text-xs">
            <DollarSign className="w-3.5 h-3.5" />
            Liability
          </TabsTrigger>
          <TabsTrigger value="trend" className="gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            Trend
          </TabsTrigger>
        </TabsList>
        <TabsContent value="utilization" className="mt-4">
          <UtilizationTab departments={departments} leaveTypes={leaveTypes} />
        </TabsContent>
        <TabsContent value="headcount" className="mt-4">
          <HeadcountTab />
        </TabsContent>
        <TabsContent value="liability" className="mt-4">
          <LiabilityTab />
        </TabsContent>
        <TabsContent value="trend" className="mt-4">
          <TrendTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
