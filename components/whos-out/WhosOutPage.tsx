'use client'

import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { WhoIsOutEntry } from '@/lib/actions/reports'
import type { UserRole } from '@/lib/types/app'

interface Department {
  id: string
  name: string
}

interface WhosOutPageProps {
  entries: WhoIsOutEntry[]
  userRole: UserRole
  userDepartmentId: string | null
  departments: Department[]
  today: string       // YYYY-MM-DD, for date calculations
  todayLabel: string  // human-readable, for display
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
    })
  }
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}

function returnDateLabel(end: string, today: string): string {
  const [ey, em, ed] = end.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  const endMs = new Date(ey, em - 1, ed).getTime()
  const todayMs = new Date(ty, tm - 1, td).getTime()
  const diff = Math.round((endMs - todayMs) / 86_400_000)
  if (diff === 0) return 'Back tomorrow'
  const [y, m, d] = end.split('-').map(Number)
  return `Returns ${new Date(y, m - 1, d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}`
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function WhosOutPage({
  entries,
  userRole,
  userDepartmentId,
  departments,
  today,
  todayLabel,
}: WhosOutPageProps) {
  const isEmployee = userRole === 'Employee'
  const canSeeDeptFilter = !isEmployee

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    isEmployee ? (userDepartmentId ?? '') : 'all'
  )

  const filtered = useMemo(() => {
    if (isEmployee) {
      return entries.filter((e) => e.user?.department_id === userDepartmentId)
    }
    if (selectedDeptId === 'all') return entries
    return entries.filter((e) => e.user?.department_id === selectedDeptId)
  }, [entries, isEmployee, userDepartmentId, selectedDeptId])

  // Group by department name, sorted alphabetically
  const grouped = useMemo(() => {
    const map = new Map<string, WhoIsOutEntry[]>()
    for (const entry of filtered) {
      const deptName = entry.user?.department?.name ?? 'Unknown Department'
      if (!map.has(deptName)) map.set(deptName, [])
      map.get(deptName)!.push(entry)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Who&apos;s Out Today
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm font-bold text-blue-700 dark:text-blue-300">
              {filtered.length} {filtered.length === 1 ? 'person' : 'people'} out
            </span>
          )}
          {canSeeDeptFilter && (
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-48 text-sm">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-16 text-center">
          <p className="text-4xl mb-3">🌟</p>
          <p className="text-base font-bold text-slate-600 dark:text-slate-300">
            Everyone&apos;s in today!
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            No approved leaves for today.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([deptName, deptEntries]) => (
            <div
              key={deptName}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Department header */}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {deptName}
                </h3>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {deptEntries.length} {deptEntries.length === 1 ? 'person' : 'people'}
                </span>
              </div>

              {/* Employee rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {deptEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">
                        {getInitials(entry.user?.full_name)}
                      </span>
                    </div>

                    {/* Name + dates */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {entry.user?.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDateRange(entry.start_date, entry.end_date)}
                        {entry.duration_modifier !== 'Full' && (
                          <span className="ml-1.5 text-slate-400">
                            ({entry.duration_modifier === 'First Half' ? 'AM' : 'PM'})
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Leave type — Manager/Admin only */}
                    {!isEmployee && entry.leave_type && (
                      <Badge
                        variant="secondary"
                        className="text-xs shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0"
                      >
                        {entry.leave_type.name}
                      </Badge>
                    )}

                    {/* Return date */}
                    <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block">
                      {returnDateLabel(entry.end_date, today)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
