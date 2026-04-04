'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Filter, Loader2 } from 'lucide-react'
import { getTeamCalendarData, type CalendarData, type Department } from '@/lib/actions/calendar'
import type { UserRole } from '@/lib/types/app'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamCalendarProps {
  initialData: CalendarData
  initialYear: number
  initialMonth: number        // 1-based
  currentUserId: string
  userRole: UserRole
  userDepartmentId: string | null
  departments: Department[]   // for Admin filter; empty for other roles
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Format YYYY-MM-DD → "DD MMM" for tooltip display */
function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)}`
}

/**
 * Given a 1-based JS-style getDay() (0=Sun … 6=Sat),
 * return the Mon-first column index (0=Mon … 6=Sun).
 */
function mondayFirstIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TeamCalendar({
  initialData,
  initialYear,
  initialMonth,
  currentUserId,
  userRole,
  userDepartmentId,
  departments,
}: TeamCalendarProps) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth) // 1-based
  const [selectedDept, setSelectedDept] = useState<string | null>(null) // null = all (Admin only)
  const [data, setData] = useState<CalendarData>(initialData)
  const [isPending, startTransition] = useTransition()

  const canFilterDept = userRole === 'Admin' && departments.length > 0

  // Resolve the department to query
  const activeDeptId = canFilterDept
    ? (selectedDept ?? null)       // Admin: null = all
    : userDepartmentId             // Employee/Manager: locked to own dept

  // ── Navigation ────────────────────────────────────────────────────────────

  function navigate(deltaMonths: number) {
    let newMonth = month + deltaMonths
    let newYear = year
    if (newMonth > 12) { newMonth -= 12; newYear++ }
    if (newMonth < 1)  { newMonth += 12; newYear-- }

    startTransition(async () => {
      const result = await getTeamCalendarData(newYear, newMonth, activeDeptId)
      if (result.success && result.data) {
        setData(result.data)
        setYear(newYear)
        setMonth(newMonth)
      }
    })
  }

  function handleDeptChange(deptId: string | null) {
    setSelectedDept(deptId)
    startTransition(async () => {
      const result = await getTeamCalendarData(year, month, deptId)
      if (result.success && result.data) setData(result.data)
    })
  }

  // ── Calendar grid data ────────────────────────────────────────────────────

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const leadingBlanks = mondayFirstIndex(firstDayOfMonth)

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

  // Build a Set of holiday dates for quick lookup
  const holidayMap = new Map<string, string>() // date → name
  for (const h of data.holidays) holidayMap.set(h.date, h.name)

  // Pre-build the active department filter label
  const activeDeptName = canFilterDept && selectedDept
    ? departments.find((d) => d.id === selectedDept)?.name ?? 'Unknown'
    : null

  // ── Render helpers ────────────────────────────────────────────────────────

  /** Determine leave bar styles based on ownership and status */
  function leaveBarStyle(isOwn: boolean, status: string) {
    if (isOwn) {
      // Own leave: always blue regardless of status
      if (status === 'Pending') {
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-300 dark:border-blue-600',
          dashed: true,
        }
      }
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: '',
        dashed: false,
      }
    }
    // Team member leave
    if (status === 'Pending') {
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/10',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-300 dark:border-amber-600',
        dashed: true,
      }
    }
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: '',
      dashed: false,
    }
  }

  function renderDay(d: number) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${year}-${pad(month)}-${pad(d)}`
    const isToday = dateStr === todayStr
    const holidayName = holidayMap.get(dateStr)
    const isHoliday = !!holidayName

    // Which day of week (Mon=0 … Sun=6)?
    const dayOfWeek = mondayFirstIndex(new Date(year, month - 1, d).getDay())
    const isWeekend = dayOfWeek >= 5 // Sat or Sun

    // Leaves that cover this date
    const dayLeaves = data.leaves.filter((l) => l.start_date <= dateStr && l.end_date >= dateStr)

    // Cell background
    let cellBg = 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-500/50'
    if (isToday) cellBg = 'bg-white dark:bg-slate-800 border-purple-400 dark:border-purple-500 shadow-sm'
    else if (isHoliday) cellBg = 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30 border-dashed'
    else if (isWeekend) cellBg = 'bg-slate-50/60 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50'

    const dayNumClass = isToday
      ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 w-6 h-6 flex items-center justify-center rounded-full text-xs font-black'
      : isHoliday
        ? 'text-orange-500 dark:text-orange-400 font-bold text-xs'
        : isWeekend
          ? 'text-slate-300 dark:text-slate-600 font-bold text-xs'
          : 'text-slate-400 dark:text-slate-500 font-bold text-xs'

    return (
      <div
        key={`day-${d}`}
        className={`min-h-20 sm:min-h-24 rounded-2xl border-2 relative overflow-y-auto flex flex-col pt-7 pb-1 transition-colors ${cellBg}`}
      >
        {/* Day number */}
        <span className={`absolute top-1.5 right-2 z-10 ${dayNumClass}`}>{d}</span>

        {/* Holiday label */}
        {isHoliday && (
          <div className="absolute top-1.5 left-1.5 right-8 truncate text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100/70 dark:bg-orange-900/30 px-1 py-0.5 rounded z-10">
            {holidayName}
          </div>
        )}

        {/* Leave bars */}
        <div className="flex flex-col gap-0.5 w-full px-0.5">
          {dayLeaves.map((leave) => {
            const isOwn = leave.user_id === currentUserId
            const isStart = leave.start_date === dateStr
            const isEnd = leave.end_date === dateStr
            const style = leaveBarStyle(isOwn, leave.status)

            const name = leave.user?.full_name?.split(' ')[0] ?? '—'
            const leaveTypeName = leave.leave_type?.name ?? ''

            // Show label: on start day OR on the first day of a week (Monday)
            const showLabel = isStart || dayOfWeek === 0

            // Build border radius
            let radius = ''
            if (isStart && isEnd) radius = 'rounded-lg mx-1'
            else if (isStart) radius = 'rounded-l-lg ml-1'
            else if (isEnd) radius = 'rounded-r-lg mr-1'
            else radius = 'rounded-none'

            const borderClass = style.dashed
              ? `border-y-2 border-dashed ${style.border}${isStart ? ' border-l-2' : ''}${isEnd ? ' border-r-2' : ''}`
              : ''

            const tooltip =
              userRole === 'Admin' || userRole === 'Manager'
                ? `${leave.user?.full_name ?? '—'} · ${leaveTypeName} (${leave.status}) · ${fmtDate(leave.start_date)}–${fmtDate(leave.end_date)}`
                : `${leave.user?.full_name ?? '—'} · ${fmtDate(leave.start_date)}–${fmtDate(leave.end_date)}`

            return (
              <div
                key={`${leave.id}-${dateStr}`}
                className={`h-5 sm:h-6 flex items-center px-1.5 text-[9px] sm:text-[10px] font-bold truncate ${style.bg} ${style.text} ${borderClass} ${radius}`}
                title={tooltip}
              >
                {showLabel ? (
                  <span className="truncate">
                    {name}
                    {(userRole === 'Manager' || userRole === 'Admin') && leaveTypeName && (
                      <span className="font-normal opacity-70 ml-1 hidden sm:inline">
                        ({leaveTypeName})
                      </span>
                    )}
                  </span>
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-100 dark:border-slate-800 min-h-[600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">Team Calendar</h1>
          {activeDeptName && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{activeDeptName}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department filter — Admin only */}
          {canFilterDept && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 focus-within:border-purple-400 dark:focus-within:border-purple-500 transition-all">
              <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm">
                <Filter className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <select
                value={selectedDept ?? ''}
                onChange={(e) => handleDeptChange(e.target.value || null)}
                className="bg-transparent border-none font-semibold text-slate-700 dark:text-slate-300 text-xs focus:ring-0 cursor-pointer outline-none pr-3 py-0.5"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Month navigation */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => navigate(-1)}
              disabled={isPending}
              className="p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-300 min-w-[130px] text-center text-sm flex items-center justify-center gap-1.5">
              {isPending && <Loader2 className="w-3 h-3 animate-spin text-purple-500" />}
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              onClick={() => navigate(1)}
              disabled={isPending}
              className="p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30 inline-block" />
          Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/10 inline-block" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-blue-100 dark:bg-blue-900/30 inline-block" />
          Your leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-orange-50 border border-dashed border-orange-200 dark:border-orange-900/30 inline-block" />
          Public holiday
        </span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Day headers */}
        {DAY_LABELS.map((day) => (
          <div
            key={day}
            className="text-center font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] sm:text-xs mb-1 sm:mb-2"
          >
            {day}
          </div>
        ))}

        {/* Leading blank cells */}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div
            key={`blank-${i}`}
            className="min-h-20 sm:min-h-24 rounded-2xl bg-slate-50/50 dark:bg-slate-800/10 border-2 border-dashed border-slate-100 dark:border-slate-800/30"
          />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => renderDay(i + 1))}
      </div>
    </div>
  )
}
