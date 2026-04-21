/**
 * AUDIT-009 / AUDIT-012 — Cancellation policy helper tests.
 *
 * Locks in the mapping between the stored policy string and the human-
 * readable description rendered on the profile / settings page. If refund
 * logic in `src/app/api/bookings/[id]/route.ts` changes, these tests will
 * fail until the display copy is updated to match.
 */

import {
  describeCancellationPolicy,
  normaliseCancellationPolicyType,
} from '@/lib/cancellation-policy'

describe('normaliseCancellationPolicyType', () => {
  it.each(['FLEXIBLE', 'MODERATE', 'STRICT'])('passes through %s', (t) => {
    expect(normaliseCancellationPolicyType(t)).toBe(t)
  })

  it.each([null, undefined, '', 'UNKNOWN', 'flexible', 'Moderate', 'foo'])(
    'defaults %p to MODERATE',
    (t) => {
      expect(normaliseCancellationPolicyType(t as string)).toBe('MODERATE')
    },
  )
})

describe('describeCancellationPolicy', () => {
  it('FLEXIBLE: full refund over 6h, none within 6h', () => {
    const s = describeCancellationPolicy('FLEXIBLE')
    expect(s.type).toBe('FLEXIBLE')
    expect(s.label).toBe('Flexible')
    expect(s.headline).toMatch(/6 hours/)
    expect(s.tiers).toEqual([
      { window: 'More than 6 hours before', refund: 'Full refund' },
      { window: 'Within 6 hours', refund: 'No refund' },
    ])
  })

  it('MODERATE: full over 24h, 50% within 24h', () => {
    const s = describeCancellationPolicy('MODERATE')
    expect(s.type).toBe('MODERATE')
    expect(s.tiers).toEqual([
      { window: 'More than 24 hours before', refund: 'Full refund' },
      { window: 'Within 24 hours', refund: '50% refund' },
    ])
  })

  it('STRICT: 48h/24h/0 tiers', () => {
    const s = describeCancellationPolicy('STRICT')
    expect(s.type).toBe('STRICT')
    expect(s.tiers).toEqual([
      { window: 'More than 48 hours before', refund: 'Full refund' },
      { window: '24–48 hours before', refund: '50% refund' },
      { window: 'Within 24 hours', refund: 'No refund' },
    ])
  })

  it('defaults unknown type to MODERATE presentation', () => {
    const s = describeCancellationPolicy('garbage')
    expect(s.type).toBe('MODERATE')
    expect(s.label).toBe('Moderate')
  })

  it('preserves custom note when provided', () => {
    const s = describeCancellationPolicy('FLEXIBLE', '  Large weddings 72h minimum. ')
    expect(s.customText).toBe('Large weddings 72h minimum.')
  })

  it('returns null customText for empty / whitespace-only input', () => {
    expect(describeCancellationPolicy('STRICT', '   ').customText).toBeNull()
    expect(describeCancellationPolicy('STRICT', '').customText).toBeNull()
    expect(describeCancellationPolicy('STRICT', null).customText).toBeNull()
    expect(describeCancellationPolicy('STRICT', undefined).customText).toBeNull()
  })
})
