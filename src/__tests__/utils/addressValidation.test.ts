/**
 * Batch B Item 5 — Address validation (Option C, pre-Places).
 *
 * Manual QA: "Point Cook" was accepted on both the booking address input
 * and the artist service-area input. These tests pin the shared regex
 * behaviour so the two surfaces stay aligned.
 */
import {
  isValidBookingAddress,
  isValidServiceArea,
} from '@/lib/address-validation'

describe('isValidBookingAddress — customer at-home street address', () => {
  it('accepts a full AU street address', () => {
    expect(isValidBookingAddress('42 Collins St, Melbourne VIC 3000')).toBe(true)
    expect(isValidBookingAddress('8 Bondi Rd, Bondi NSW 2026')).toBe(true)
  })

  it('accepts addresses with unit/level/apt prefixes', () => {
    expect(isValidBookingAddress('Unit 4, 42 George Street, Sydney NSW 2000')).toBe(true)
    expect(isValidBookingAddress('Level 12, 101 Collins St, Melbourne VIC 3000')).toBe(true)
    expect(isValidBookingAddress('Apt 5A, 99 Queen St, Brisbane QLD 4000')).toBe(true)
  })

  it('accepts street-number letter suffixes and subdivisions', () => {
    expect(isValidBookingAddress('42a Collins Street Melbourne 3000')).toBe(true)
    expect(isValidBookingAddress('4/42 George St, Sydney NSW 2000')).toBe(true)
  })

  it('rejects bare suburb names (the documented bug)', () => {
    expect(isValidBookingAddress('Point Cook')).toBe(false)
    expect(isValidBookingAddress('Bondi')).toBe(false)
    expect(isValidBookingAddress('Melbourne')).toBe(false)
  })

  it('rejects suburb + state without a street number', () => {
    expect(isValidBookingAddress('Point Cook, VIC 3030')).toBe(false)
    expect(isValidBookingAddress('Melbourne VIC 3000')).toBe(false)
  })

  it('rejects empty / whitespace / too-short input', () => {
    expect(isValidBookingAddress('')).toBe(false)
    expect(isValidBookingAddress(null)).toBe(false)
    expect(isValidBookingAddress(undefined)).toBe(false)
    expect(isValidBookingAddress('   ')).toBe(false)
    expect(isValidBookingAddress('42 St')).toBe(false)  // under 10 chars
  })
})

describe('isValidServiceArea — artist "where do you offer your service"', () => {
  it('accepts "Suburb, STATE postcode"', () => {
    expect(isValidServiceArea('Point Cook, VIC 3030')).toBe(true)
    expect(isValidServiceArea('Bondi, NSW 2026')).toBe(true)
    expect(isValidServiceArea('Richmond, VIC 3121')).toBe(true)
  })

  it('accepts "Suburb STATE postcode" without the comma', () => {
    expect(isValidServiceArea('Point Cook VIC 3030')).toBe(true)
    expect(isValidServiceArea('Bondi NSW 2026')).toBe(true)
  })

  it('accepts all eight AU states / territories', () => {
    expect(isValidServiceArea('Sydney NSW 2000')).toBe(true)
    expect(isValidServiceArea('Melbourne VIC 3000')).toBe(true)
    expect(isValidServiceArea('Brisbane QLD 4000')).toBe(true)
    expect(isValidServiceArea('Adelaide SA 5000')).toBe(true)
    expect(isValidServiceArea('Perth WA 6000')).toBe(true)
    expect(isValidServiceArea('Hobart TAS 7000')).toBe(true)
    expect(isValidServiceArea('Darwin NT 0800')).toBe(true)
    expect(isValidServiceArea('Canberra ACT 2600')).toBe(true)
  })

  it('is case-insensitive on the state', () => {
    expect(isValidServiceArea('Bondi nsw 2026')).toBe(true)
    expect(isValidServiceArea('Bondi, nsw 2026')).toBe(true)
  })

  it('rejects bare suburb names (the documented bug)', () => {
    expect(isValidServiceArea('Point Cook')).toBe(false)
    expect(isValidServiceArea('Melbourne')).toBe(false)
  })

  it('rejects state-only or postcode-only', () => {
    expect(isValidServiceArea('VIC 3000')).toBe(false)
    expect(isValidServiceArea('3000')).toBe(false)
    expect(isValidServiceArea('VIC')).toBe(false)
  })

  it('rejects unstructured free-text', () => {
    expect(isValidServiceArea('Anywhere in Melbourne')).toBe(false)
    expect(isValidServiceArea('Near Queen Street')).toBe(false)
    expect(isValidServiceArea('random text')).toBe(false)
  })

  it('rejects empty / whitespace', () => {
    expect(isValidServiceArea('')).toBe(false)
    expect(isValidServiceArea(null)).toBe(false)
    expect(isValidServiceArea(undefined)).toBe(false)
    expect(isValidServiceArea('   ')).toBe(false)
  })

  it('rejects foreign state codes', () => {
    expect(isValidServiceArea('New York NY 10001')).toBe(false)
    expect(isValidServiceArea('London UK SW1A')).toBe(false)
  })
})
