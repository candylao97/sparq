/**
 * AUDIT-037 — timezone-safe booking datetime utilities.
 *
 * The bug this test file locks in: several client pages were computing
 * "is this booking in the past?" with a hardcoded `+10:00` offset, which is
 * only AEST. During AEDT (first Sunday October → first Sunday April) Sydney
 * is actually UTC+11, so the cutoff slid by an hour for roughly half the year.
 * That mis-firing flipped the "No Show" button on and off too early and
 * nudged cancellation-policy refund tiers (6/24/48 hours) across boundaries
 * unfairly.
 *
 * These tests pin the DST-aware behaviour of src/lib/booking-time.ts so we
 * can catch regressions if anyone reintroduces `Date(\`...+10:00\`)` parsing.
 */

import {
  bookingToUtc,
  hoursUntilBooking,
  utcToSydneyDateStr,
  bookingDateFieldToUtc,
  to24Hour,
} from '@/lib/booking-time'
import { parseBookingUrlState } from '@/lib/booking-url-state'

describe('booking-time — DST handling (AUDIT-037)', () => {
  describe('bookingToUtc', () => {
    it('treats winter dates as AEST (UTC+10)', () => {
      // Southern-hemisphere winter: AEST is in effect.
      const utc = bookingToUtc('2025-07-15', '09:00')
      // 09:00 AEST = 23:00 UTC the previous day.
      expect(utc.toISOString()).toBe('2025-07-14T23:00:00.000Z')
    })

    it('treats summer dates as AEDT (UTC+11)', () => {
      // Southern-hemisphere summer: AEDT is in effect.
      const utc = bookingToUtc('2025-12-15', '09:00')
      // 09:00 AEDT = 22:00 UTC the previous day.
      expect(utc.toISOString()).toBe('2025-12-14T22:00:00.000Z')
    })

    it('is not off-by-one across the April AEDT→AEST transition', () => {
      // In 2026, DST ends at 03:00 AEDT on Sunday 2026-04-05 (clocks fall back to 02:00 AEST).
      // A Saturday 2026-04-04 09:00 booking is still AEDT (UTC+11).
      const beforeTransition = bookingToUtc('2026-04-04', '09:00')
      expect(beforeTransition.toISOString()).toBe('2026-04-03T22:00:00.000Z')

      // A Sunday 2026-04-05 09:00 booking is AEST (UTC+10) because 09:00 is
      // comfortably after the 03:00 fallback.
      const afterTransition = bookingToUtc('2026-04-05', '09:00')
      expect(afterTransition.toISOString()).toBe('2026-04-04T23:00:00.000Z')
    })

    it('is not off-by-one across the October AEST→AEDT transition', () => {
      // In 2025, DST starts at 02:00 AEST on Sunday 2025-10-05 (clocks jump forward to 03:00 AEDT).
      const beforeTransition = bookingToUtc('2025-10-04', '09:00') // AEST
      expect(beforeTransition.toISOString()).toBe('2025-10-03T23:00:00.000Z')

      const afterTransition = bookingToUtc('2025-10-05', '09:00') // AEDT
      expect(afterTransition.toISOString()).toBe('2025-10-04T22:00:00.000Z')
    })
  })

  describe('hoursUntilBooking', () => {
    const realNow = Date.now

    afterEach(() => {
      Date.now = realNow
    })

    it('returns negative hours for a past booking (AEDT/summer)', () => {
      // Freeze "now" to 2025-12-15T23:00:00Z = 2025-12-16 10:00 AEDT.
      Date.now = () => new Date('2025-12-15T23:00:00Z').getTime()

      // Booking is 2025-12-15 09:00 AEDT = 2025-12-14T22:00:00Z
      // So the booking is 25 hours in the past.
      const delta = hoursUntilBooking('2025-12-15', '09:00')
      expect(delta).toBeCloseTo(-25, 5)
    })

    it('returns positive hours for a future booking (AEST/winter)', () => {
      Date.now = () => new Date('2025-07-14T23:00:00Z').getTime() // 2025-07-15 09:00 AEST
      // Booking is 2025-07-16 09:00 AEST = 2025-07-15T23:00:00Z — 24h ahead.
      const delta = hoursUntilBooking('2025-07-16', '09:00')
      expect(delta).toBeCloseTo(24, 5)
    })

    it('AUDIT-037 repro: a +10:00 hardcode would mis-fire by 1h during AEDT', () => {
      // Scenario: customer booked 09:00 on a summer day. Provider opens the
      // dashboard exactly at that wall-clock moment in Sydney. The NO_SHOW
      // gate should report "now" (hoursUntilBooking === 0), not "1 hour
      // past" — which is what the old `+10:00` hardcode produced.
      const sydneyWallClock9am = new Date('2025-12-14T22:00:00Z') // 09:00 AEDT
      Date.now = () => sydneyWallClock9am.getTime()

      expect(hoursUntilBooking('2025-12-15', '09:00')).toBeCloseTo(0, 5)

      // What the buggy code would have computed (09:00 treated as AEST):
      const buggy = new Date('2025-12-15T09:00:00+10:00').getTime()
      const buggyDelta = (buggy - sydneyWallClock9am.getTime()) / 3_600_000
      // The bug reports +1h instead of 0 — which would keep the NO_SHOW
      // button hidden for an extra hour in AEDT.
      expect(buggyDelta).toBeCloseTo(1, 5)
    })
  })

  describe('utcToSydneyDateStr', () => {
    it('returns the Sydney-local calendar date for a late-evening UTC timestamp', () => {
      // 2025-12-15T13:30:00Z = 00:30 on 2025-12-16 AEDT.
      expect(utcToSydneyDateStr(new Date('2025-12-15T13:30:00Z'))).toBe('2025-12-16')
    })

    it('returns the Sydney-local calendar date during AEST', () => {
      // 2025-07-14T23:00:00Z = 09:00 on 2025-07-15 AEST.
      expect(utcToSydneyDateStr(new Date('2025-07-14T23:00:00Z'))).toBe('2025-07-15')
    })
  })

  describe('bookingDateFieldToUtc', () => {
    it('combines a noon-UTC DB date with an HH:MM time into a real UTC instant (AEDT)', () => {
      // DB stores the booking date as noon UTC on 2025-12-15, with time = '09:00'.
      // The booking actually happens at 09:00 AEDT on 2025-12-15 = 22:00 UTC on 2025-12-14.
      const dbDate = new Date('2025-12-15T12:00:00Z')
      const utc = bookingDateFieldToUtc(dbDate, '09:00')
      expect(utc.toISOString()).toBe('2025-12-14T22:00:00.000Z')
    })
  })
})

/**
 * Manual-QA P0 (Apr 2026): POST /api/bookings was returning 400
 * "time must be in HH:MM format" because the wizard state had
 * "3:30 PM" (12-hour display) instead of "15:30". Lock in the canonical-
 * 24h conversion so the bug can't reappear via URL deep-links or
 * future setter call-sites.
 */
describe('to24Hour — booking time normalisation', () => {
  it('passes through canonical 24-hour HH:MM unchanged', () => {
    expect(to24Hour('09:00')).toBe('09:00')
    expect(to24Hour('15:30')).toBe('15:30')
    expect(to24Hour('23:59')).toBe('23:59')
    expect(to24Hour('00:00')).toBe('00:00')
  })

  it('zero-pads single-digit hour in 24h shape', () => {
    expect(to24Hour('9:00')).toBe('09:00')
    expect(to24Hour('1:30')).toBe('01:30')
  })

  it('converts 12-hour PM display strings to 24-hour', () => {
    expect(to24Hour('3:30 PM')).toBe('15:30')
    expect(to24Hour('1:00 PM')).toBe('13:00')
    expect(to24Hour('11:45 PM')).toBe('23:45')
  })

  it('converts 12-hour AM display strings to 24-hour', () => {
    expect(to24Hour('9:30 AM')).toBe('09:30')
    expect(to24Hour('1:00 AM')).toBe('01:00')
    expect(to24Hour('11:59 AM')).toBe('11:59')
  })

  it('handles the 12 AM / 12 PM edge cases', () => {
    expect(to24Hour('12:00 AM')).toBe('00:00') // midnight
    expect(to24Hour('12:00 PM')).toBe('12:00') // noon
    expect(to24Hour('12:30 AM')).toBe('00:30')
    expect(to24Hour('12:30 PM')).toBe('12:30')
  })

  it('is case-insensitive on the AM/PM marker', () => {
    expect(to24Hour('3:30 pm')).toBe('15:30')
    expect(to24Hour('3:30 Pm')).toBe('15:30')
    expect(to24Hour('9:00 am')).toBe('09:00')
  })

  it('returns null for invalid or missing input', () => {
    expect(to24Hour('')).toBeNull()
    expect(to24Hour(null)).toBeNull()
    expect(to24Hour(undefined)).toBeNull()
    expect(to24Hour('25:00')).toBeNull()      // 25h doesn't exist
    expect(to24Hour('13:30 PM')).toBeNull()   // 13 is invalid 12h
    expect(to24Hour('00:30 AM')).toBeNull()   // 0 is invalid 12h
    expect(to24Hour('foo')).toBeNull()
    expect(to24Hour('3:30 XM')).toBeNull()
  })
})

/**
 * Companion check: the URL-state hydrator must also normalise time. A
 * deep-link like `/book/123?time=3:30+PM` was the most likely vector
 * for the QA bug — `parseBookingUrlState` previously just took the URL
 * value verbatim.
 */
describe('parseBookingUrlState — time normalisation', () => {
  function paramsFrom(record: Record<string, string>) {
    return new URLSearchParams(record)
  }

  it('hydrates a 12h URL time as 24h state', () => {
    const state = parseBookingUrlState(paramsFrom({ time: '3:30 PM' }))
    expect(state.time).toBe('15:30')
  })

  it('passes through a 24h URL time unchanged', () => {
    const state = parseBookingUrlState(paramsFrom({ time: '15:30' }))
    expect(state.time).toBe('15:30')
  })

  it('falls back to empty string for an unparseable URL time', () => {
    const state = parseBookingUrlState(paramsFrom({ time: 'foo' }))
    expect(state.time).toBe('')
  })

  it('falls back to empty string when no time param is present', () => {
    const state = parseBookingUrlState(paramsFrom({}))
    expect(state.time).toBe('')
  })
})
