/**
 * Tests for address privacy logic across the platform.
 *
 * Validates that:
 *  - Booking address is hidden for non-CONFIRMED/COMPLETED bookings
 *  - Provider studio address is hidden unless customer has a confirmed booking
 *  - Provider contact info (phone/email) is hidden unless customer has a confirmed booking
 *
 * These tests validate the data transformation logic used in API routes.
 */

// ─── Booking Address Privacy Logic ──────────────────────────────────────────
// From: src/app/api/bookings/[id]/route.ts GET handler

describe('Booking address privacy', () => {
  const statuses = [
    'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED',
    'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER',
    'DECLINED', 'EXPIRED', 'REFUNDED', 'DISPUTED',
  ]

  const shouldRevealAddress = (status: string): boolean => {
    return ['CONFIRMED', 'COMPLETED'].includes(status)
  }

  it('reveals address for CONFIRMED bookings', () => {
    expect(shouldRevealAddress('CONFIRMED')).toBe(true)
  })

  it('reveals address for COMPLETED bookings', () => {
    expect(shouldRevealAddress('COMPLETED')).toBe(true)
  })

  const hiddenStatuses = statuses.filter(s => !['CONFIRMED', 'COMPLETED'].includes(s))

  test.each(hiddenStatuses)('hides address for %s bookings', (status) => {
    expect(shouldRevealAddress(status)).toBe(false)
  })
})

// ─── Provider Contact Info Privacy Logic ────────────────────────────────────
// From: src/app/api/providers/[id]/route.ts GET handler

describe('Provider contact info privacy', () => {
  // Simulates the sanitization logic from the provider detail endpoint
  const sanitizeProfile = (
    profile: { studioAddress: string | null; phone: string | null; email: string | null },
    showContactInfo: boolean,
  ) => ({
    studioAddress: showContactInfo ? profile.studioAddress : null,
    phone: showContactInfo ? profile.phone : null,
    email: showContactInfo ? profile.email : null,
  })

  const fullProfile = {
    studioAddress: '42 Smith St, Sydney',
    phone: '0412345678',
    email: 'provider@example.com',
  }

  it('hides all contact info when showContactInfo is false', () => {
    const result = sanitizeProfile(fullProfile, false)
    expect(result.studioAddress).toBeNull()
    expect(result.phone).toBeNull()
    expect(result.email).toBeNull()
  })

  it('reveals all contact info when showContactInfo is true', () => {
    const result = sanitizeProfile(fullProfile, true)
    expect(result.studioAddress).toBe('42 Smith St, Sydney')
    expect(result.phone).toBe('0412345678')
    expect(result.email).toBe('provider@example.com')
  })

  it('returns null for already-null fields regardless of showContactInfo', () => {
    const nullProfile = { studioAddress: null, phone: null, email: null }
    const result = sanitizeProfile(nullProfile, true)
    expect(result.studioAddress).toBeNull()
    expect(result.phone).toBeNull()
    expect(result.email).toBeNull()
  })
})

// ─── Dashboard Address Privacy ──────────────────────────────────────────────
// From: src/app/api/dashboard/customer/route.ts and dashboard/provider/route.ts

describe('Dashboard address privacy', () => {
  // Simulates the mapBooking function from customer dashboard
  const mapBookingAddress = (
    booking: { status: string; address: string | null },
  ): string | null => {
    return ['CONFIRMED', 'COMPLETED'].includes(booking.status) ? booking.address : null
  }

  it('returns address for CONFIRMED booking in dashboard', () => {
    const result = mapBookingAddress({ status: 'CONFIRMED', address: '42 Smith St' })
    expect(result).toBe('42 Smith St')
  })

  it('returns address for COMPLETED booking in dashboard', () => {
    const result = mapBookingAddress({ status: 'COMPLETED', address: '42 Smith St' })
    expect(result).toBe('42 Smith St')
  })

  it('hides address for PENDING booking in dashboard', () => {
    const result = mapBookingAddress({ status: 'PENDING', address: '42 Smith St' })
    expect(result).toBeNull()
  })

  it('hides address for CANCELLED_BY_CUSTOMER booking in dashboard', () => {
    const result = mapBookingAddress({ status: 'CANCELLED_BY_CUSTOMER', address: '42 Smith St' })
    expect(result).toBeNull()
  })

  it('hides address for DECLINED booking in dashboard', () => {
    const result = mapBookingAddress({ status: 'DECLINED', address: '42 Smith St' })
    expect(result).toBeNull()
  })

  it('hides address for DISPUTED booking in dashboard', () => {
    const result = mapBookingAddress({ status: 'DISPUTED', address: '42 Smith St' })
    expect(result).toBeNull()
  })
})
