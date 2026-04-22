/**
 * Sentinel dates used to represent recurring weekly availability.
 * Week 2000-01-03 (Mon) through 2000-01-09 (Sun) maps to day-of-week 1–0.
 */
const SENTINEL_DATES: Record<number, string> = {
  1: '2000-01-03', // Monday
  2: '2000-01-04', // Tuesday
  3: '2000-01-05', // Wednesday
  4: '2000-01-06', // Thursday
  5: '2000-01-07', // Friday
  6: '2000-01-08', // Saturday
  0: '2000-01-09', // Sunday
}

/**
 * Returns the sentinel date string (YYYY-MM-DD) for the given ISO day-of-week.
 * dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
 */
export function getSentinelDateString(dayOfWeek: number): string {
  return SENTINEL_DATES[dayOfWeek] ?? '2000-01-03'
}

/**
 * Returns a Date object set to noon UTC on the sentinel date for the given day.
 */
export function getSentinelDate(dayOfWeek: number): Date {
  return new Date(`${getSentinelDateString(dayOfWeek)}T12:00:00.000Z`)
}

/**
 * Given a Date, returns whether it falls on a sentinel week.
 */
export function isSentinelDate(date: Date): boolean {
  const d = date.toISOString().slice(0, 10)
  return Object.values(SENTINEL_DATES).includes(d)
}
