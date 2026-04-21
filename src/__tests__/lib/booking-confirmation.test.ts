/**
 * Tests for booking-confirmation helpers (AUDIT-005).
 *
 * Covers the two concerns the audit flags:
 *  1. getConfirmationMode() correctly distinguishes instant-book (CONFIRMED)
 *     from request-to-book (PENDING), and failed payments take precedence.
 *  2. getConfirmationCopy() returns the correct headline/subtext/next-steps
 *     for each mode, including a snapshot for regression safety.
 */

import {
  getConfirmationMode,
  getConfirmationCopy,
  type ConfirmationMode,
} from '@/lib/booking-confirmation'

// ─── getConfirmationMode ─────────────────────────────────────────────────────

describe('getConfirmationMode', () => {
  it('returns "confirmed" for instant-book (status=CONFIRMED, no payment issue)', () => {
    expect(
      getConfirmationMode({ status: 'CONFIRMED', paymentStatus: 'AUTH_PENDING' }),
    ).toBe('confirmed')
  })

  it('returns "confirmed" for CONFIRMED bookings with AUTHORISED or CAPTURED payments', () => {
    expect(getConfirmationMode({ status: 'CONFIRMED', paymentStatus: 'AUTHORISED' })).toBe('confirmed')
    expect(getConfirmationMode({ status: 'CONFIRMED', paymentStatus: 'CAPTURED' })).toBe('confirmed')
  })

  it('returns "confirmed" for $0 CONFIRMED bookings (paymentStatus=NONE or null)', () => {
    expect(getConfirmationMode({ status: 'CONFIRMED', paymentStatus: 'NONE' })).toBe('confirmed')
    expect(getConfirmationMode({ status: 'CONFIRMED', paymentStatus: null })).toBe('confirmed')
    expect(getConfirmationMode({ status: 'CONFIRMED' })).toBe('confirmed')
  })

  it('returns "pending" for request-to-book (status=PENDING)', () => {
    expect(
      getConfirmationMode({ status: 'PENDING', paymentStatus: 'AUTH_PENDING' }),
    ).toBe('pending')
  })

  it('returns "pending" for $0 PENDING bookings', () => {
    expect(getConfirmationMode({ status: 'PENDING', paymentStatus: 'NONE' })).toBe('pending')
    expect(getConfirmationMode({ status: 'PENDING' })).toBe('pending')
  })

  it('returns "failed" when paymentStatus=FAILED, regardless of booking status', () => {
    expect(getConfirmationMode({ status: 'CONFIRMED', paymentStatus: 'FAILED' })).toBe('failed')
    expect(getConfirmationMode({ status: 'PENDING', paymentStatus: 'FAILED' })).toBe('failed')
  })

  it('defaults unknown statuses to "pending" so the page never hard-fails', () => {
    // Should not reach the confirmation page, but deep-links could land here.
    expect(getConfirmationMode({ status: 'COMPLETED' })).toBe('pending')
    expect(getConfirmationMode({ status: 'CANCELLED' })).toBe('pending')
    expect(getConfirmationMode({ status: 'BOGUS_STATUS' })).toBe('pending')
  })
})

// ─── getConfirmationCopy — content checks ────────────────────────────────────

describe('getConfirmationCopy — confirmed', () => {
  const copy = getConfirmationCopy({
    mode: 'confirmed',
    artistFirstName: 'Lily',
    acceptDeadlineText: 'until Thursday 6pm',
  })

  it('uses "Booking confirmed!" headline (not "request sent")', () => {
    expect(copy.headline).toBe('Booking confirmed!')
    expect(copy.headline).not.toContain('request')
  })

  it('subtext references the artist by first name', () => {
    expect(copy.subtext).toContain('Lily')
  })

  it('uses the "check" icon with coral tint', () => {
    expect(copy.iconKey).toBe('check')
    expect(copy.iconColorClass).toContain('E96B56')
  })

  it('next-steps focus on preparation, not acceptance', () => {
    const joined = copy.nextSteps.map(s => s.title).join(' ').toLowerCase()
    expect(joined).toContain('email')
    expect(joined).toContain('appointment')
    // Should NOT mention "accept or decline" flow
    expect(joined).not.toContain('declines')
  })

  it('always returns exactly 3 next-steps', () => {
    expect(copy.nextSteps).toHaveLength(3)
  })
})

describe('getConfirmationCopy — pending', () => {
  const copy = getConfirmationCopy({
    mode: 'pending',
    artistFirstName: 'Lily',
    acceptDeadlineText: 'until Thursday 6pm',
  })

  it('uses "Booking request sent!" headline', () => {
    expect(copy.headline).toBe('Booking request sent!')
  })

  it('subtext shows the accept-deadline window', () => {
    expect(copy.subtext).toContain('until Thursday 6pm')
  })

  it('subtext starts with a capitalised artist name', () => {
    // Lily -> already capitalised; helper still re-capitalises defensively
    expect(copy.subtext.startsWith('Lily')).toBe(true)
  })

  it('uses the "clock" icon', () => {
    expect(copy.iconKey).toBe('clock')
  })

  it('next-steps describe the acceptance flow', () => {
    const joined = copy.nextSteps.map(s => s.title + ' ' + s.desc).join(' ').toLowerCase()
    expect(joined).toContain('confirm')
    expect(joined).toContain('card')
  })

  it('embeds the accept-deadline text into step 1', () => {
    expect(copy.nextSteps[0].desc).toContain('until Thursday 6pm')
  })
})

describe('getConfirmationCopy — failed', () => {
  const copy = getConfirmationCopy({ mode: 'failed' })

  it('uses "Payment issue" headline', () => {
    expect(copy.headline).toBe('Payment issue')
  })

  it('uses the amber "alert" icon', () => {
    expect(copy.iconKey).toBe('alert')
    expect(copy.iconBgClass).toContain('amber')
    expect(copy.iconColorClass).toContain('amber')
  })

  it('directs the user to retry', () => {
    expect(copy.subtext.toLowerCase()).toContain('retry')
  })
})

// ─── getConfirmationCopy — fallbacks ─────────────────────────────────────────

describe('getConfirmationCopy — fallbacks', () => {
  it('falls back to "your artist" if artistFirstName is missing', () => {
    const copy = getConfirmationCopy({ mode: 'confirmed' })
    expect(copy.subtext.toLowerCase()).toContain('your artist')
  })

  it('falls back to "within 24 hours" if acceptDeadlineText is missing', () => {
    const copy = getConfirmationCopy({ mode: 'pending', artistFirstName: 'Lily' })
    expect(copy.subtext).toContain('within 24 hours')
    expect(copy.nextSteps[0].desc).toContain('within 24 hours')
  })

  it('treats whitespace-only artist name as missing', () => {
    const copy = getConfirmationCopy({ mode: 'confirmed', artistFirstName: '   ' })
    expect(copy.subtext.toLowerCase()).toContain('your artist')
  })

  it('treats whitespace-only deadline as missing', () => {
    const copy = getConfirmationCopy({ mode: 'pending', acceptDeadlineText: '  ' })
    expect(copy.subtext).toContain('within 24 hours')
  })
})

// ─── getConfirmationCopy — snapshot tests (AUDIT-005 acceptance) ─────────────

describe('getConfirmationCopy — snapshots', () => {
  // Acceptance criterion: snapshot test covers both branches.
  // We include the failed branch too to lock in retry copy.

  const modes: ConfirmationMode[] = ['confirmed', 'pending', 'failed']

  for (const mode of modes) {
    it(`matches snapshot for mode=${mode}`, () => {
      const copy = getConfirmationCopy({
        mode,
        artistFirstName: 'Lily',
        acceptDeadlineText: 'until Thursday 6pm',
      })
      expect(copy).toMatchSnapshot()
    })
  }
})
