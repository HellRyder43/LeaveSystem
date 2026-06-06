'use client'

import { useState, useEffect, useTransition, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { CalendarIcon, AlertTriangle, Info, Users } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button }   from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea }  from '@/components/ui/textarea'
import { Badge }     from '@/components/ui/badge'

import { leaveRequestFormSchema, type LeaveRequestFormValues } from '@/lib/schemas/leave'
import {
  applyForLeave, getTeamConflictsForDates, getCoveringEmployeeConflict,
  type TeamConflict, type CoveringConflict,
} from '@/lib/actions/leave'
import type { LeaveTypeConfig, EffectiveLeaveBalance } from '@/lib/types/app'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  leaveTypes:         LeaveTypeConfig[]
  balances:           EffectiveLeaveBalance[]
  nextYearBalances:   EffectiveLeaveBalance[]
  coveringEmployees:  { id: string; full_name: string }[]
  publicHolidays:     string[]   // YYYY-MM-DD strings
  settings:           { backdatedWindowDays: number; leaveYearStartMonth: number }
  currentLeaveYear:   number
  userDepartmentId:   string | null
}

// ─── Client-side helpers ──────────────────────────────────────────────────────

function getKLTodayStr(): string {
  // Approximate KL date on the client (UTC+8)
  const now = new Date()
  const klOffset = 8 * 60
  const klMs = now.getTime() + (klOffset + now.getTimezoneOffset()) * 60000
  const kl = new Date(klMs)
  return kl.toISOString().slice(0, 10)
}

function clientLeaveYear(date: string, leaveYearStartMonth: number): number {
  const [year, month] = date.split('-').map(Number)
  if (leaveYearStartMonth === 1) return year
  return month < leaveYearStartMonth ? year - 1 : year
}

function clientLeaveYearEnd(year: number, leaveYearStartMonth: number): string {
  if (leaveYearStartMonth === 1) return `${year}-12-31`
  const endMonth = leaveYearStartMonth - 1
  const calYear  = year + 1
  const lastDay  = new Date(calYear, endMonth, 0).getDate()
  return `${calYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function clientLeaveYearStart(year: number, leaveYearStartMonth: number): string {
  if (leaveYearStartMonth === 1) return `${year}-01-01`
  return `${year}-${String(leaveYearStartMonth).padStart(2, '0')}-01`
}

function countWorkingDaysClient(
  start: string,
  end: string,
  holidays: string[]
): { workingDays: number; calendarDays: number; holidayCount: number } {
  const holidaySet = new Set(holidays)
  let current = new Date(`${start}T12:00:00Z`)
  const endDate = new Date(`${end}T12:00:00Z`)
  let workingDays = 0
  let holidayCount = 0
  const calendarDays =
    Math.round((endDate.getTime() - current.getTime()) / 86400000) + 1

  while (current <= endDate) {
    const ds  = current.toISOString().slice(0, 10)
    const dow = current.getUTCDay()
    if (dow !== 0 && dow !== 6) {
      if (holidaySet.has(ds)) holidayCount++
      else workingDays++
    }
    current = addDays(current, 1)
  }
  return { workingDays, calendarDays, holidayCount }
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequestLeaveForm({
  leaveTypes,
  balances,
  nextYearBalances,
  coveringEmployees,
  publicHolidays,
  settings,
  currentLeaveYear,
  userDepartmentId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [teamConflicts, setTeamConflicts] = useState<TeamConflict[]>([])
  const [coveringConflict, setCoveringConflict] = useState<CoveringConflict | null>(null)
  const [loadingConflicts, setLoadingConflicts] = useState(false)

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      leave_type_id:        '',
      start_date:           '',
      end_date:             '',
      duration_modifier:    'Full',
      reason:               '',
      covering_employee_id: '',
      notes:                '',
    },
  })

  const watchedLeaveTypeId      = form.watch('leave_type_id')
  const watchedDurationModifier = form.watch('duration_modifier')
  const watchedCoveringEmployee = form.watch('covering_employee_id')
  const watchedStartDate        = form.watch('start_date')
  const watchedEndDate          = form.watch('end_date')

  const selectedLeaveType = leaveTypes.find((lt) => lt.id === watchedLeaveTypeId)

  // ── Working days info (client-side calculation) ──────────────────
  const workingDaysInfo = useMemo(() => {
    if (!watchedStartDate || !watchedEndDate || watchedStartDate > watchedEndDate) return null
    return countWorkingDaysClient(watchedStartDate, watchedEndDate, publicHolidays)
  }, [watchedStartDate, watchedEndDate, publicHolidays])

  // ── Duration used in preview ────────────────────────────────────
  const isHalfDay = watchedDurationModifier === 'First Half' || watchedDurationModifier === 'Second Half'
  const durationDays = isHalfDay ? 0.5 : (workingDaysInfo?.workingDays ?? 0)

  // ── Cross-year detection (client-side) ───────────────────────────
  const isCrossYear = !!(
    watchedStartDate &&
    watchedEndDate &&
    clientLeaveYear(watchedStartDate, settings.leaveYearStartMonth) !==
    clientLeaveYear(watchedEndDate, settings.leaveYearStartMonth)
  )

  // ── Balance preview ─────────────────────────────────────────────
  const balancePreview = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) return null
    if (!selectedLeaveType?.is_paid) return null // Unpaid — no preview needed

    const startYear = clientLeaveYear(watchedStartDate, settings.leaveYearStartMonth)
    const endYear   = clientLeaveYear(watchedEndDate,   settings.leaveYearStartMonth)
    const crossYear = startYear !== endYear

    if (crossYear && !isHalfDay) {
      const yearEndDate   = clientLeaveYearEnd(startYear,  settings.leaveYearStartMonth)
      const yearStartDate = clientLeaveYearStart(endYear,  settings.leaveYearStartMonth)

      const first  = countWorkingDaysClient(watchedStartDate, yearEndDate,   publicHolidays)
      const second = countWorkingDaysClient(yearStartDate,    watchedEndDate, publicHolidays)

      const firstBal  = balances.find((b) => b.leave_type_id === watchedLeaveTypeId)
      const secondBal = nextYearBalances.find((b) => b.leave_type_id === watchedLeaveTypeId)

      return {
        isCrossYear:        true,
        firstYearDays:      first.workingDays,
        secondYearDays:     second.workingDays,
        firstYearBal:       firstBal?.effective_balance  ?? null,
        secondYearBal:      secondBal?.effective_balance ?? null,
        firstYear:          startYear,
        secondYear:         endYear,
        firstSufficient:    (firstBal?.effective_balance ?? 0) >= first.workingDays,
        secondSufficient:   (secondBal?.effective_balance ?? 0) >= second.workingDays,
      }
    }

    const balance = balances.find((b) => b.leave_type_id === watchedLeaveTypeId)
    if (!balance) return null
    const remaining = balance.effective_balance - durationDays

    return {
      isCrossYear:        false,
      effectiveBalance:   balance.effective_balance,
      remaining,
      sufficient:         remaining >= 0,
    }
  }, [
    watchedLeaveTypeId, watchedStartDate, watchedEndDate,
    watchedDurationModifier, selectedLeaveType, balances, nextYearBalances,
    durationDays, isHalfDay, isCrossYear, settings.leaveYearStartMonth, publicHolidays,
  ])

  // ── Team conflicts (server call when dates change) ───────────────
  useEffect(() => {
    if (!watchedStartDate || !watchedEndDate || !userDepartmentId) {
      setTeamConflicts([])
      return
    }
    setLoadingConflicts(true)
    startTransition(async () => {
      const result = await getTeamConflictsForDates(
        userDepartmentId, watchedStartDate, watchedEndDate
      )
      setTeamConflicts(result.data ?? [])
      setLoadingConflicts(false)
    })
  }, [watchedStartDate, watchedEndDate, userDepartmentId])

  // ── Covering employee conflict (server call when selection changes)─
  useEffect(() => {
    if (!watchedCoveringEmployee || !watchedStartDate || !watchedEndDate) {
      setCoveringConflict(null)
      return
    }
    startTransition(async () => {
      const result = await getCoveringEmployeeConflict(
        watchedCoveringEmployee, watchedStartDate, watchedEndDate
      )
      setCoveringConflict(result.data ?? null)
    })
  }, [watchedCoveringEmployee, watchedStartDate, watchedEndDate])

  // ── Reset half-day when leave type doesn't allow it ──────────────
  useEffect(() => {
    if (!selectedLeaveType?.allow_half_day && isHalfDay) {
      form.setValue('duration_modifier', 'Full')
    }
  }, [selectedLeaveType?.allow_half_day, isHalfDay, form])

  // ── Reset half-day when date range is multi-day ──────────────────
  useEffect(() => {
    if (watchedStartDate && watchedEndDate && watchedStartDate !== watchedEndDate && isHalfDay) {
      form.setValue('duration_modifier', 'Full')
    }
  }, [watchedStartDate, watchedEndDate, isHalfDay, form])

  // ── Derived state ────────────────────────────────────────────────
  const today = getKLTodayStr()
  const isBackdated = !!watchedStartDate && watchedStartDate < today
  const requiresReason =
    isBackdated && !!selectedLeaveType?.name.toLowerCase().includes('annual')
  const requiresMC =
    !!(selectedLeaveType?.requires_attachment &&
    workingDaysInfo &&
    durationDays > (selectedLeaveType.attachment_required_after_days ?? 1))

  // Earliest selectable date
  const earliestDate = useMemo(() => {
    const d = new Date()
    return addDays(d, -settings.backdatedWindowDays)
  }, [settings.backdatedWindowDays])

  // Holidays as Date objects for calendar modifiers
  const holidayDates = useMemo(
    () => publicHolidays.map((h) => new Date(`${h}T12:00:00Z`)),
    [publicHolidays]
  )

  // ── Submit ───────────────────────────────────────────────────────
  const onSubmit = (values: LeaveRequestFormValues) => {
    if (requiresMC && !fileInputRef.current?.files?.[0]) {
      toast.error('Please upload your medical certificate.')
      return
    }

    const formData = new FormData()
    formData.append('leave_type_id', values.leave_type_id)
    formData.append('start_date', values.start_date)
    formData.append('end_date', values.end_date)
    formData.append('duration_modifier', values.duration_modifier)
    if (values.reason)               formData.append('reason', values.reason)
    if (values.covering_employee_id) formData.append('covering_employee_id', values.covering_employee_id)
    if (values.notes)                formData.append('notes', values.notes)

    const file = fileInputRef.current?.files?.[0]
    if (file) formData.append('attachment', file)

    startTransition(async () => {
      const result = await applyForLeave(formData)
      if (result.success) {
        toast.success('Leave request submitted successfully.')
        router.push('/leaves')
      } else {
        toast.error(result.error ?? 'Failed to submit leave request.')
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Leave Type ──────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="leave_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Leave Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      <span>{lt.name}</span>
                      {!lt.is_paid && (
                        <Badge variant="outline" className="ml-2 text-xs">Unpaid</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Date Range ──────────────────────────────────────────── */}
        <div className="space-y-2">
          <FormLabel className="font-semibold">Date Range</FormLabel>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal h-10"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span>
                      {format(dateRange.from, 'dd MMM yyyy')}
                      {' '}—{' '}
                      {format(dateRange.to, 'dd MMM yyyy')}
                    </span>
                  ) : (
                    format(dateRange.from, 'dd MMM yyyy')
                  )
                ) : (
                  <span className="text-muted-foreground">Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range)
                  const startStr = range?.from ? format(range.from, 'yyyy-MM-dd') : ''
                  // If only from is selected, use it as end too until user picks end
                  const endStr = range?.to
                    ? format(range.to, 'yyyy-MM-dd')
                    : startStr
                  form.setValue('start_date', startStr, { shouldValidate: true })
                  form.setValue('end_date', endStr,   { shouldValidate: true })
                  if (range?.to) setCalendarOpen(false)
                }}
                disabled={[
                  { before: earliestDate },
                  (date: Date) => date.getDay() === 0 || date.getDay() === 6,
                ]}
                modifiers={{ holiday: holidayDates }}
                modifiersClassNames={{
                  holiday:
                    'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 font-medium',
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>

          {/* Hidden form fields for validation */}
          <input type="hidden" {...form.register('start_date')} />
          <input type="hidden" {...form.register('end_date')} />
          {form.formState.errors.start_date && (
            <p className="text-sm text-rose-500">{form.formState.errors.start_date.message}</p>
          )}
          {form.formState.errors.end_date && (
            <p className="text-sm text-rose-500">{form.formState.errors.end_date.message}</p>
          )}

          {/* Working days summary */}
          {workingDaysInfo && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {workingDaysInfo.workingDays} working day{workingDaysInfo.workingDays !== 1 ? 's' : ''}
                </span>
                {' '}({workingDaysInfo.calendarDays} calendar day{workingDaysInfo.calendarDays !== 1 ? 's' : ''}
                {workingDaysInfo.holidayCount > 0 && (
                  <> — {workingDaysInfo.holidayCount} public holiday{workingDaysInfo.holidayCount !== 1 ? 's' : ''} excluded</>
                )})
              </span>
            </div>
          )}
        </div>

        {/* ── Duration Modifier ────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="duration_modifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Duration</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Full">Full Day</SelectItem>
                  {selectedLeaveType?.allow_half_day && (
                    <>
                      <SelectItem
                        value="First Half"
                        disabled={!!watchedStartDate && watchedStartDate !== watchedEndDate}
                      >
                        First Half (AM)
                        {watchedStartDate && watchedStartDate !== watchedEndDate && (
                          <span className="text-slate-400 ml-1 text-xs">(single day only)</span>
                        )}
                      </SelectItem>
                      <SelectItem
                        value="Second Half"
                        disabled={!!watchedStartDate && watchedStartDate !== watchedEndDate}
                      >
                        Second Half (PM)
                        {watchedStartDate && watchedStartDate !== watchedEndDate && (
                          <span className="text-slate-400 ml-1 text-xs">(single day only)</span>
                        )}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Balance Preview ─────────────────────────────────────── */}
        {balancePreview && durationDays > 0 && (
          <div
            className={`rounded-xl p-4 border text-sm space-y-1 ${
              (balancePreview.isCrossYear
                ? balancePreview.firstSufficient && balancePreview.secondSufficient
                : balancePreview.sufficient)
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800'
                : 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800'
            }`}
          >
            {balancePreview.isCrossYear ? (
              <>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Cross-year request</p>
                <p className={balancePreview.firstSufficient ? 'text-slate-600 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400'}>
                  {balancePreview.firstYear}: {balancePreview.firstYearDays} day{balancePreview.firstYearDays !== 1 ? 's' : ''} used
                  {balancePreview.firstYearBal !== null && ` (${balancePreview.firstYearBal} available)`}
                  {!balancePreview.firstSufficient && ' — insufficient balance'}
                </p>
                <p className={balancePreview.secondSufficient ? 'text-slate-600 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400'}>
                  {balancePreview.secondYear}: {balancePreview.secondYearDays} day{balancePreview.secondYearDays !== 1 ? 's' : ''} used
                  {balancePreview.secondYearBal !== null && ` (${balancePreview.secondYearBal} available)`}
                  {!balancePreview.secondSufficient && ' — insufficient balance'}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Balance after this request
                </p>
                <p className={balancePreview.sufficient ? 'text-slate-600 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400'}>
                  {balancePreview.remaining} day{balancePreview.remaining !== 1 ? 's' : ''} remaining
                  {!balancePreview.sufficient && ' — insufficient balance'}
                  {' '}(currently {balancePreview.effectiveBalance} available)
                </p>
              </>
            )}
          </div>
        )}

        {/* Unpaid leave note */}
        {selectedLeaveType && !selectedLeaveType.is_paid && watchedStartDate && (
          <div className="rounded-xl p-3 bg-blue-50 border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400">
            Unpaid leave — no balance deducted. Approval still required.
          </div>
        )}

        {/* ── Team Conflict Warning ─────────────────────────────────── */}
        {!loadingConflicts && teamConflicts.length > 0 && (
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-400">
              <Users className="w-4 h-4 shrink-0" />
              {teamConflicts.length} team member{teamConflicts.length > 1 ? 's' : ''} also on leave during this period
            </div>
            <ul className="space-y-1 text-amber-700 dark:text-amber-500">
              {teamConflicts.map((c, i) => (
                <li key={i}>
                  {c.full_name} — {fmtDate(c.start_date)} to {fmtDate(c.end_date)}
                </li>
              ))}
            </ul>
            <p className="text-amber-600 dark:text-amber-500 text-xs">
              You may still submit this request. Your manager will review staffing.
            </p>
          </div>
        )}

        {/* ── Reason ─────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">
                Reason
                {requiresReason && <span className="text-rose-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    requiresReason
                      ? 'Required for backdated annual leave'
                      : 'Optional — provide context for your request'
                  }
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Medical Certificate ──────────────────────────────────── */}
        {selectedLeaveType?.requires_attachment && (
          <div className="space-y-2">
            <FormLabel className="font-semibold">
              Medical Certificate
              {requiresMC && <span className="text-rose-500 ml-1">*</span>}
            </FormLabel>
            {requiresMC && (
              <p className="text-sm text-slate-500">
                Required for {selectedLeaveType.name.toLowerCase()} leave exceeding{' '}
                {selectedLeaveType.attachment_required_after_days ?? 1} day
                {(selectedLeaveType.attachment_required_after_days ?? 1) !== 1 ? 's' : ''}.
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="block w-full text-sm text-slate-600 dark:text-slate-400
                file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700
                hover:file:bg-purple-100 dark:file:bg-purple-900/20 dark:file:text-purple-400
                cursor-pointer"
            />
            <p className="text-xs text-slate-400">PDF, JPG, or PNG. Max 5 MB.</p>
          </div>
        )}

        {/* ── Covering Employee ────────────────────────────────────── */}
        {coveringEmployees.length > 0 && (
          <FormField
            control={form.control}
            name="covering_employee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Covering Employee</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a colleague (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {coveringEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Covering employee conflict warning */}
        {coveringConflict && (
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-400">
                  Covering employee has approved leave during this period
                </p>
                <p className="text-amber-700 dark:text-amber-500 mt-0.5">
                  {coveringConflict.full_name} is on approved leave from{' '}
                  {fmtDate(coveringConflict.start_date)} to {fmtDate(coveringConflict.end_date)}.
                  You may still proceed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Additional Notes ─────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information for your manager (optional)"
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Submit ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold px-8 shadow-md shadow-purple-500/20 hover:brightness-110 transition-all"
          >
            {isPending ? 'Submitting…' : 'Submit Leave Request'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/leaves')}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>

      </form>
    </Form>
  )
}
