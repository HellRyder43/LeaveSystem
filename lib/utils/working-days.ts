import { addDays } from 'date-fns'
import { format } from 'date-fns-tz'
import { isWeekend, parseDate } from './dates'
import { createClient } from '@/lib/supabase/server'

/**
 * Count working days between two YYYY-MM-DD date strings (inclusive),
 * excluding weekends and the provided public holiday dates.
 */
export function countWorkingDays(
  start: string,
  end: string,
  holidays: string[] = []
): number {
  const holidaySet = new Set(holidays)
  let current = parseDate(start)
  const endDate = parseDate(end)
  let count = 0

  while (current <= endDate) {
    const dateStr = format(current, 'yyyy-MM-dd')
    if (!isWeekend(current) && !holidaySet.has(dateStr)) {
      count++
    }
    current = addDays(current, 1)
  }

  return count
}

/**
 * Count working days between two YYYY-MM-DD date strings (inclusive),
 * fetching public holidays from the database.
 *
 * Fetches global holidays + department-specific holidays if departmentId is provided.
 * This function must only be called from server-side code.
 */
export async function getWorkingDaysBetween(
  start: string,
  end: string,
  departmentId?: string | null
): Promise<{ workingDays: number; holidays: string[]; calendarDays: number }> {
  const supabase = await createClient()

  // Fetch all holidays in the date range: global + dept-specific
  let query = supabase
    .from('public_holidays')
    .select('date')
    .gte('date', start)
    .lte('date', end)

  if (departmentId) {
    // global (null) OR matching department
    query = query.or(`department_id.is.null,department_id.eq.${departmentId}`)
  } else {
    query = query.is('department_id', null)
  }

  const { data: holidayRows, error } = await query

  if (error) {
    console.error('[getWorkingDaysBetween] Failed to fetch holidays:', error.message)
  }

  const holidays = (holidayRows ?? []).map((h) => h.date)
  const startDate = parseDate(start)
  const endDate = parseDate(end)

  // Inclusive calendar day count
  const msPerDay = 1000 * 60 * 60 * 24
  const calendarDays = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1

  const workingDays = countWorkingDays(start, end, holidays)

  return { workingDays, holidays, calendarDays }
}

/**
 * Count working days elapsed since a given date (inclusive of start, up to today).
 * Used for SLA age calculations.
 */
export function workingDaysSince(dateStr: string, holidays: string[] = []): number {
  const holidaySet = new Set(holidays)
  const start = parseDate(dateStr)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let current = start
  let count = 0

  while (current <= today) {
    const ds = format(current, 'yyyy-MM-dd')
    if (!isWeekend(current) && !holidaySet.has(ds)) {
      count++
    }
    current = addDays(current, 1)
  }

  // Don't count the start day itself — age starts at 0
  return Math.max(0, count - 1)
}
