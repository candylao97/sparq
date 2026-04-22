/**
 * Timezone-safe booking datetime utilities for Australia/Sydney.
 *
 * Australia/Sydney observes:
 *   AEST  UTC+10  (first Sunday April  → first Sunday October)
 *   AEDT  UTC+11  (first Sunday October → first Sunday April)
 *
 * All functions here use date-fns-tz with the IANA timezone database so
 * that DST transitions are handled automatically.
 *
 * Design rules:
 *  - The DB stores `date` (DATE, noon UTC sentinel) and `time` (HH:MM string).
 *  - "Booking datetime" = the wall-clock time the appointment happens in Sydney.
 *  - Comparisons that need a real instant (e.g. 24h cancellation check) must
 *    first materialise a proper UTC Date via `bookingToUtc()`.
 */

import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz'

export const SYDNEY_TZ = 'Australia/Sydney'

/**
 * Convert a YYYY-MM-DD date string + HH:MM time string (as the customer/artist
 * sees them in Sydney local time) into a UTC Date object.
 *
 * Example:
 *   bookingToUtc('2024-11-15', '09:00')
 *   → In AEDT (UTC+11): returns 2024-11-14T22:00:00.000Z
 *   → In AEST (UTC+10): returns 2024-11-15T23:00:00.000Z
 */
export function bookingToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  // Construct an ISO string that represents the local Sydney wall-clock time,
  // then let date-fns-tz convert it to a real UTC instant.
  const localIso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  return fromZonedTime(localIso, SYDNEY_TZ)
}

/**
 * How many hours remain until a Sydney-local booking time, measured from now.
 * Positive = booking is in the future.  Negative = booking has passed.
 */
export function hoursUntilBooking(dateStr: string, timeStr: string): number {
  const bookingUtc = bookingToUtc(dateStr, timeStr)
  return (bookingUtc.getTime() - Date.now()) / (1_000 * 60 * 60)
}

/**
 * Convert a DB Date (stored at noon UTC) back to a YYYY-MM-DD string in
 * Sydney local time.  Use this when you need the calendar date the artist /
 * customer actually sees.
 */
export function utcToSydneyDateStr(utcDate: Date): string {
  return formatInTimeZone(utcDate, SYDNEY_TZ, 'yyyy-MM-dd')
}

/**
 * Given a UTC Date that represents a booking's `date` field (noon UTC) plus
 * the `time` string stored separately, return the UTC instant of that booking.
 */
export function bookingDateFieldToUtc(dbDate: Date, timeStr: string): Date {
  const dateStr = utcToSydneyDateStr(dbDate)
  return bookingToUtc(dateStr, timeStr)
}

/**
 * Format a booking date+time for display in Sydney local time.
 * e.g. "Saturday, 15 November 2024 at 9:00 AM AEDT"
 */
export function formatBookingDateTimeSydney(dbDate: Date, timeStr: string): string {
  const utc = bookingDateFieldToUtc(dbDate, timeStr)
  return formatInTimeZone(utc, SYDNEY_TZ, "EEEE, d MMMM yyyy 'at' h:mm a zzz")
}

/**
 * Return the current time in Sydney as a ZonedDateTime-like object for
 * date comparisons.
 */
export function nowInSydney(): Date {
  return toZonedTime(new Date(), SYDNEY_TZ)
}

/**
 * Normalise a time string into the canonical 24-hour `HH:MM` shape the
 * booking API expects.
 *
 * Manual QA found that POST /api/bookings was rejecting submissions with
 * `"time must be in HH:MM format"` because the booking-wizard state was
 * receiving 12-hour display strings (`"3:30 PM"`) via URL deep-links.
 * The slot-button setter and the seeded availability slots are already
 * 24-hour, so the contamination only happens via URL hydration / external
 * deep-links — but the right defence is at the boundary, not at every
 * setter.
 *
 * Accepted inputs:
 *   - `"15:30"`, `"9:00"`        → already 24h, returned with a 2-digit hour
 *   - `"3:30 PM"`, `"3:30 pm"`   → 12h with AM/PM marker
 *   - `"12:00 AM"` (midnight)    → `"00:00"`
 *   - `"12:00 PM"` (noon)        → `"12:00"`
 *
 * Rejected inputs return `null`:
 *   - `""` / `null` / `undefined`
 *   - `"25:00"` / `"13:30 PM"`   (invalid hours)
 *   - `"foo"` / `"3:30 XM"`
 */
export function to24Hour(time: string | null | undefined): string | null {
  if (!time) return null
  const trimmed = time.trim()

  // 24-hour shape — accept either H:MM or HH:MM, normalise to HH:MM.
  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (h24) {
    const h = Number(h24[1])
    const m = Number(h24[2])
    if (h < 0 || h > 23 || m < 0 || m > 59) return null
    return `${String(h).padStart(2, '0')}:${h24[2]}`
  }

  // 12-hour shape — H:MM AM / HH:MM PM (case-insensitive, single space).
  const h12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/)
  if (h12) {
    const rawH = Number(h12[1])
    const m = Number(h12[2])
    const isPm = h12[3].toLowerCase() === 'p'
    if (rawH < 1 || rawH > 12 || m < 0 || m > 59) return null
    let h = rawH % 12          // 12 → 0, 1..11 unchanged
    if (isPm) h += 12          // 0..11 → 12..23 for PM
    return `${String(h).padStart(2, '0')}:${h12[2]}`
  }

  return null
}
