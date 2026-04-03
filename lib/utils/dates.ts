import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { addDays, isWeekend as dateFnsIsWeekend, differenceInCalendarDays } from 'date-fns'

export const KL_TZ = 'Asia/Kuala_Lumpur'

/**
 * Convert any Date or ISO string to a YYYY-MM-DD string in Asia/Kuala_Lumpur timezone.
 */
export function toKLDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(toZonedTime(d, KL_TZ), 'yyyy-MM-dd', { timeZone: KL_TZ })
}

/**
 * Get today's date as a YYYY-MM-DD string in Asia/Kuala_Lumpur timezone.
 */
export function getKLToday(): string {
  return toKLDate(new Date())
}

/**
 * Get the current Date object representing the start of today in Asia/Kuala_Lumpur timezone.
 */
export function getKLTodayDate(): Date {
  const todayStr = getKLToday()
  return new Date(`${todayStr}T00:00:00+08:00`)
}

/**
 * Returns true if the given date falls on a Saturday or Sunday.
 * Accepts YYYY-MM-DD string or Date.
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(`${date}T12:00:00Z`) : date
  return dateFnsIsWeekend(d)
}

/**
 * Determine which leave year a date belongs to.
 * @param date             YYYY-MM-DD string
 * @param leaveYearStartMonth  1-based month number (e.g. 1 = January)
 */
export function getLeaveYear(date: string, leaveYearStartMonth: number): number {
  const [year, month] = date.split('-').map(Number)
  // If the leave year starts in January, leave year = calendar year
  if (leaveYearStartMonth === 1) return year
  // If start month > 1, dates before the start month belong to the previous leave year
  return month < leaveYearStartMonth ? year - 1 : year
}

/**
 * Inclusive count of calendar days between two YYYY-MM-DD date strings.
 */
export function countCalendarDays(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  return differenceInCalendarDays(e, s) + 1
}

/**
 * Add n working days to a date, skipping weekends and optionally public holidays.
 * @param date      YYYY-MM-DD string
 * @param n         number of working days to add
 * @param holidays  array of YYYY-MM-DD holiday date strings to skip
 */
export function addWorkingDays(date: string, n: number, holidays: string[] = []): string {
  const holidaySet = new Set(holidays)
  let current = new Date(`${date}T12:00:00Z`)
  let added = 0

  while (added < n) {
    current = addDays(current, 1)
    const dateStr = format(current, 'yyyy-MM-dd')
    if (!dateFnsIsWeekend(current) && !holidaySet.has(dateStr)) {
      added++
    }
  }

  return format(current, 'yyyy-MM-dd')
}

/**
 * Subtract n working days from a date, skipping weekends and optionally public holidays.
 * Used to calculate cancellation windows (e.g. "1 working day before start").
 */
export function subtractWorkingDays(date: string, n: number, holidays: string[] = []): string {
  const holidaySet = new Set(holidays)
  let current = new Date(`${date}T12:00:00Z`)
  let subtracted = 0

  while (subtracted < n) {
    current = addDays(current, -1)
    const dateStr = format(current, 'yyyy-MM-dd')
    if (!dateFnsIsWeekend(current) && !holidaySet.has(dateStr)) {
      subtracted++
    }
  }

  return format(current, 'yyyy-MM-dd')
}

/**
 * Parse a YYYY-MM-DD string into UTC midnight Date (safe for calendar comparisons).
 */
export function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`)
}

/**
 * Format a Date to YYYY-MM-DD in UTC (for DB storage comparisons).
 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
