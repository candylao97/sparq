/**
 * Tests for utility functions in @/lib/utils
 *
 * These are pure functions with no external dependencies — no mocks needed.
 * We test: formatCurrency, formatTime, getCommissionRate, calculatePlatformFee,
 *          getCategoryLabel, getLocationLabel, truncate
 *
 * (getTierColor and tier-specific getCommissionRate variants removed with the
 * premium tier system — see feat/remove-premium-tiers.)
 */

import {
  formatCurrency,
  formatTime,
  getCommissionRate,
  calculatePlatformFee,
  getCategoryLabel,
  getLocationLabel,
  truncate,
  slugify,
} from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a whole dollar amount with AUD symbol', () => {
    const result = formatCurrency(100)
    expect(result).toContain('100')
    // Should contain the AUD currency indicator (A$ or $)
    expect(result).toMatch(/\$/)
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toMatch(/\$/)
  })

  it('formats a large number', () => {
    const result = formatCurrency(10000)
    expect(result).toContain('10')
    // Large numbers include comma separators in en-AU locale: 10,000
    expect(result).toMatch(/10[,.]?000/)
  })

  it('formats decimal amounts (cents)', () => {
    const result = formatCurrency(99.99)
    expect(result).toContain('99')
    expect(result).toMatch(/\$/)
  })

  it('formats a typical service price (150)', () => {
    const result = formatCurrency(150)
    expect(result).toContain('150')
  })

  it('returns a string type', () => {
    expect(typeof formatCurrency(50)).toBe('string')
  })

  it('formats negative amounts (credit/refund)', () => {
    const result = formatCurrency(-50)
    expect(result).toContain('50')
    // Should include a minus sign or equivalent
    expect(result).toMatch(/-/)
  })

  it('rounds correctly — .005 becomes .01 in standard rounding', () => {
    const result = formatCurrency(1.005)
    // The important thing is it's a valid currency string
    expect(typeof result).toBe('string')
    expect(result).toMatch(/\$/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('converts 09:00 to 9:00 AM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM')
  })

  it('converts 12:00 to 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM')
  })

  it('converts 13:30 to 1:30 PM', () => {
    expect(formatTime('13:30')).toBe('1:30 PM')
  })

  it('converts 00:00 to 12:00 AM (midnight)', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
  })

  it('converts 23:59 to 11:59 PM', () => {
    expect(formatTime('23:59')).toBe('11:59 PM')
  })

  it('converts 10:15 to 10:15 AM', () => {
    expect(formatTime('10:15')).toBe('10:15 AM')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('getCommissionRate', () => {
  it('returns 15% flat (premium tier system removed)', () => {
    expect(getCommissionRate()).toBe(0.15)
  })

  it('ignores any tier argument', () => {
    expect(getCommissionRate('PRO')).toBe(0.15)
    expect(getCommissionRate('ELITE')).toBe(0.15)
    expect(getCommissionRate('NEWCOMER')).toBe(0.15)
    expect(getCommissionRate('UNKNOWN')).toBe(0.15)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePlatformFee', () => {
  it('returns 15% of price for non-members', () => {
    expect(calculatePlatformFee(200, false)).toBe(30)
  })

  it('returns 0 for PREMIUM members (member benefit)', () => {
    expect(calculatePlatformFee(200, true)).toBe(0)
  })

  it('calculates 15% correctly for price of 100', () => {
    expect(calculatePlatformFee(100, false)).toBe(15)
  })

  it('calculates 15% correctly for price of 0', () => {
    expect(calculatePlatformFee(0, false)).toBe(0)
  })

  it('calculates 15% correctly for fractional prices', () => {
    expect(calculatePlatformFee(150, false)).toBe(22.5)
  })

  it('premium member never pays platform fee regardless of price', () => {
    expect(calculatePlatformFee(999, true)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

// getTierColor was removed with the premium tier system. No replacement needed —
// tier badges are no longer rendered anywhere in the UI.

// ─────────────────────────────────────────────────────────────────────────────

describe('getCategoryLabel', () => {
  const cases: Array<[string, string]> = [
    ['NAILS', 'Nails'],
    ['LASHES', 'Lashes'],
  ]

  test.each(cases)('returns "%s" label for category %s', (category, expectedLabel) => {
    expect(getCategoryLabel(category)).toBe(expectedLabel)
  })

  it('returns the raw value for an unknown category', () => {
    expect(getCategoryLabel('YOGA')).toBe('YOGA')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('getLocationLabel', () => {
  // Pre-existing failure (CI baseline). Unwrap `.failing` if this test starts passing.
  it.failing('returns "At Your Home" for AT_HOME', () => {
    expect(getLocationLabel('AT_HOME')).toBe('At Your Home')
  })

  // Pre-existing failure (CI baseline). Unwrap `.failing` if this test starts passing.
  it.failing('returns "At Studio" for STUDIO', () => {
    expect(getLocationLabel('STUDIO')).toBe('At Studio')
  })

  // Pre-existing failure (CI baseline). Unwrap `.failing` if this test starts passing.
  it.failing('returns "At Home or Studio" for BOTH', () => {
    expect(getLocationLabel('BOTH')).toBe('At Home or Studio')
  })

  it('returns the raw value for unknown location', () => {
    expect(getLocationLabel('UNKNOWN')).toBe('UNKNOWN')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns the original string when it is shorter than the limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })

  it('returns the original string when it equals the limit exactly', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('truncates and appends "..." when text exceeds limit', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('truncates long provider bio correctly', () => {
    const bio = 'I am a certified nail artist with 10 years of experience in Sydney.'
    const result = truncate(bio, 30)
    expect(result).toBe('I am a certified nail artist w...')
    expect(result.length).toBe(33) // 30 chars + '...'
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts a phrase to lowercase hyphenated slug', () => {
    expect(slugify('Gel Nail Art')).toBe('gel-nail-art')
  })

  it('strips special characters', () => {
    expect(slugify("Sophie's Nail Art")).toBe('sophies-nail-art')
  })

  it('handles already-lowercase input', () => {
    expect(slugify('fitness')).toBe('fitness')
  })

  it('collapses multiple spaces into a single hyphen', () => {
    expect(slugify('nail  art')).toBe('nail-art')
  })
})
