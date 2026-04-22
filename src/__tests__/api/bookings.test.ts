/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for /api/bookings (GET, POST) and /api/bookings/[id] (GET, PATCH)
 *
 * Strategy:
 *  - Mock next-auth's getServerSession to control authentication state
 *  - Mock @/lib/prisma to avoid hitting a real database
 *  - Mock @/lib/utils helpers that do price calculations
 *  - Construct real NextRequest objects and call the route handlers directly
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock next-auth so we can control session state in each test
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock the authOptions import (needed by getServerSession call inside routes)
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test_123', client_secret: 'cs_test_secret' }),
      capture: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' }),
      cancel: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'canceled' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'requires_capture' }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_test_123' }),
    },
  },
}))

// Mock content-filter
jest.mock('@/lib/content-filter', () => ({
  filterContactInfo: jest.fn().mockReturnValue({
    text: 'Please bring oils',
    flagged: false,
    flagType: null,
    matches: [],
  }),
  filterContactInfoLax: jest.fn().mockReturnValue({
    text: 'Please bring oils',
    flagged: false,
    flagType: null,
    matches: [],
  }),
}))

// Mock Prisma client – every method starts as jest.fn() so tests can override
// AUDIT-017 adds a `prisma.$transaction(async tx => …)` wrapper around the PATCH
// handler. For unit tests we reuse the outer `prisma` proxy as the `tx` so
// `tx.booking.findUnique(…)` etc. resolve to the same jest.fn() instances the
// test overrides. Initializer runs later — the mock below returns a thunk that
// reads `prisma` lazily at call time.
jest.mock('@/lib/prisma', () => {
  const prisma: Record<string, unknown> = {
    $transaction: jest.fn((fn) =>
      typeof fn === 'function' ? Promise.resolve(fn(prisma)) : Promise.all(fn),
    ),
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    service: {
      findUnique: jest.fn(),
    },
    customerProfile: {
      findUnique: jest.fn(),
    },
    giftVoucher: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    availability: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    bookingStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    payout: {
      create: jest.fn().mockResolvedValue({}),
    },
    contactLeakageFlag: {
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  }
  return { prisma }
})

// Mock utility functions used by the booking route
jest.mock('@/lib/utils', () => ({
  getCommissionRate: jest.fn().mockReturnValue(0.15),
  calculatePlatformFee: jest.fn().mockReturnValue(10),
}))

// AUDIT-017: Rate limiter defaults to "allowed" so existing POST/PATCH tests
// are not affected. A dedicated test suite in bookings-velocity.test.ts
// overrides this to assert 429 behaviour.
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(true),
}))

// ─── Imports (after mocks are registered) ───────────────────────────────────

import { GET as bookingsGET, POST as bookingsPOST } from '@/app/api/bookings/route'
import { GET as bookingByIdGET, PATCH as bookingByIdPATCH } from '@/app/api/bookings/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal authenticated session object */
const makeSession = (overrides: Partial<{ id: string; role: string }> = {}) => ({
  user: { id: 'user-customer-1', role: 'CUSTOMER', ...overrides },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
})

/** Build a NextRequest with optional JSON body and search params */
function makeRequest(
  url: string,
  method: string = 'GET',
  body?: object,
): NextRequest {
  const init: ConstructorParameters<typeof NextRequest>[1] = { method }
  if (body) {
    init!.body = JSON.stringify(body)
    init!.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url, init)
}

/** Shorthand typed cast */
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('GET /api/bookings', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when the user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/bookings')
    const res = await bookingsGET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns the authenticated customer\'s bookings (role=customer)', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)

    const fakeBookings = [
      { id: 'booking-1', customerId: 'user-customer-1', status: 'PENDING' },
      { id: 'booking-2', customerId: 'user-customer-1', status: 'CONFIRMED' },
    ]
    ;(mockPrisma.booking.findMany as jest.Mock).mockResolvedValueOnce(fakeBookings)

    const req = makeRequest('http://localhost/api/bookings?role=customer')
    const res = await bookingsGET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.bookings).toHaveLength(2)
    expect(json.bookings[0].id).toBe('booking-1')

    // Verify Prisma was called with customer filter
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'user-customer-1' },
      }),
    )
  })

  it('queries by providerId when role=provider', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-provider-1', role: 'PROVIDER' }) as any)
    ;(mockPrisma.booking.findMany as jest.Mock).mockResolvedValueOnce([])

    const req = makeRequest('http://localhost/api/bookings?role=provider')
    await bookingsGET(req)

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: 'user-provider-1' },
      }),
    )
  })

  it('returns 500 when Prisma throws', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'))

    const req = makeRequest('http://localhost/api/bookings')
    const res = await bookingsGET(req)

    expect(res.status).toBe(500)
  })

  it('does not return bookings belonging to another customer', async () => {
    // Customer A is authenticated
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-customer-A' }) as any)

    // Prisma returns only Customer A's bookings (the route filters by session id)
    const customerABookings = [{ id: 'booking-A', customerId: 'user-customer-A' }]
    ;(mockPrisma.booking.findMany as jest.Mock).mockResolvedValueOnce(customerABookings)

    const req = makeRequest('http://localhost/api/bookings?role=customer')
    const res = await bookingsGET(req)
    const json = await res.json()

    // All returned bookings belong to Customer A
    expect(json.bookings.every((b: any) => b.customerId === 'user-customer-A')).toBe(true)

    // Verify route never asks for a different customer's data
    const callArgs = (mockPrisma.booking.findMany as jest.Mock).mock.calls[0][0]
    expect(callArgs.where).not.toHaveProperty('customerId', 'user-customer-B')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  const validBody = {
    serviceId: 'service-1',
    date: '2026-05-01',
    time: '10:00',
    locationType: 'AT_HOME',
    address: '123 Test St, Sydney',
    guestCount: 2,
    notes: 'Please bring oils',
  }

  const fakeService = {
    id: 'service-1',
    title: 'Gel Manicure',
    price: 200,
    duration: 60,
    isActive: true,
    isDeleted: false,
    maxGuests: 4,
    instantBook: false,
    provider: {
      id: 'provider-profile-1',
      userId: 'user-provider-1',
      tier: 'TRUSTED',
      accountStatus: 'ACTIVE',
      isVerified: true,
      latitude: null,
      longitude: null,
      serviceRadius: 10,
      timezone: 'Australia/Sydney',
      stripeSubscriptionStatus: null,
      user: { id: 'user-provider-1', name: 'Provider Jane', email: 'provider@example.com' },
    },
  }

  /** Set up availability and slot-conflict mocks so the POST handler passes those checks */
  const setupAvailabilityMocks = () => {
    // availability.findUnique – provider is available with the requested time slot
    ;(mockPrisma.availability.findUnique as jest.Mock).mockResolvedValue({
      id: 'avail-1',
      providerId: 'provider-profile-1',
      date: new Date('2026-05-01T12:00:00Z'),
      isBlocked: false,
      timeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00'],
    })
    // booking.findMany for slot-conflict check – no existing bookings
    ;(mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([])
  }

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/bookings', 'POST', validBody)
    const res = await bookingsPOST(req)

    expect(res.status).toBe(401)
  })

  it('creates a booking and returns it', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.service.findUnique as jest.Mock).mockResolvedValueOnce(fakeService)
    setupAvailabilityMocks()
    ;(mockPrisma.customerProfile.findUnique as jest.Mock).mockResolvedValueOnce({ membership: 'FREE' })
    ;(mockPrisma.booking.create as jest.Mock).mockResolvedValueOnce({
      id: 'new-booking-1',
      customerId: 'user-customer-1',
      providerId: 'user-provider-1',
      serviceId: 'service-1',
      status: 'PENDING',
      totalPrice: 210,
      platformFee: 10,
      commissionRate: 0.13,
    })
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({}) // stripe PI update
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/bookings', 'POST', validBody)
    const res = await bookingsPOST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.booking.id).toBe('new-booking-1')
    expect(json.booking.status).toBe('PENDING')
  })

  it('returns 404 when the service does not exist', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.service.findUnique as jest.Mock).mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/bookings', 'POST', {
      ...validBody,
      serviceId: 'nonexistent-service',
    })
    const res = await bookingsPOST(req)

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Service not found')
  })

  it('applies a valid gift voucher discount', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.service.findUnique as jest.Mock).mockResolvedValueOnce(fakeService)
    setupAvailabilityMocks()
    ;(mockPrisma.customerProfile.findUnique as jest.Mock).mockResolvedValueOnce({ membership: 'FREE' })
    // Atomic updateMany succeeds (voucher is valid)
    ;(mockPrisma.giftVoucher.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 })
    // findUnique to get the voucher amount
    ;(mockPrisma.giftVoucher.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'voucher-1',
      code: 'SAVE50',
      amount: 50,
      isRedeemed: true,
    })

    let capturedBookingData: any = null
    ;(mockPrisma.booking.create as jest.Mock).mockImplementationOnce((args) => {
      capturedBookingData = args.data
      return Promise.resolve({ id: 'booking-with-voucher', ...args.data })
    })
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({}) // stripe PI update
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/bookings', 'POST', {
      ...validBody,
      giftVoucherCode: 'SAVE50',
    })
    await bookingsPOST(req)

    // totalPrice should be (service.price + platformFee) - voucherDiscount
    // = (200 + 10) - 50 = 160  (utils mocks: calculatePlatformFee → 10)
    expect(capturedBookingData.totalPrice).toBe(160)
  })

  it('does not apply an expired gift voucher', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.service.findUnique as jest.Mock).mockResolvedValueOnce(fakeService)
    setupAvailabilityMocks()
    ;(mockPrisma.customerProfile.findUnique as jest.Mock).mockResolvedValueOnce({ membership: 'FREE' })
    // Atomic updateMany returns count 0 (voucher expired/invalid)
    ;(mockPrisma.giftVoucher.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 })

    const req = makeRequest('http://localhost/api/bookings', 'POST', {
      ...validBody,
      giftVoucherCode: 'OLD50',
    })
    const res = await bookingsPOST(req)

    // The route now returns 400 when voucher is invalid/expired
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Voucher is invalid, expired, or already used')
  })

  it('creates a notification for the provider after booking', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.service.findUnique as jest.Mock).mockResolvedValueOnce(fakeService)
    setupAvailabilityMocks()
    ;(mockPrisma.customerProfile.findUnique as jest.Mock).mockResolvedValueOnce({ membership: 'FREE' })
    ;(mockPrisma.booking.create as jest.Mock).mockResolvedValueOnce({ id: 'b-1' })
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({}) // stripe PI update
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/bookings', 'POST', validBody)
    await bookingsPOST(req)

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-provider-1',
          type: 'NEW_BOOKING',
        }),
      }),
    )
  })

  it('returns 500 on unexpected database error', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.service.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB crash'))

    const req = makeRequest('http://localhost/api/bookings', 'POST', validBody)
    const res = await bookingsPOST(req)

    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/bookings/[id]', () => {
  const params = { id: 'booking-1' }

  const fakeBooking = {
    id: 'booking-1',
    customerId: 'user-customer-1',
    providerId: 'user-provider-1',
    status: 'PENDING',
    totalPrice: 210,
    platformFee: 10,
    stripePaymentId: 'pi_test_123',
    service: { id: 'service-1', title: 'Gel Manicure', provider: { id: 'provider-profile-1' } },
    provider: { providerProfile: { id: 'provider-profile-1' } },
  }

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/bookings/booking-1', 'PATCH', { status: 'CONFIRMED' })
    const res = await bookingByIdPATCH(req, { params })

    expect(res.status).toBe(401)
  })

  it('returns 404 when booking does not exist', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-provider-1', role: 'PROVIDER' }) as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/bookings/nonexistent', 'PATCH', { status: 'CONFIRMED' })
    const res = await bookingByIdPATCH(req, { params: { id: 'nonexistent' } })

    expect(res.status).toBe(404)
  })

  it('allows provider to accept (CONFIRMED) a booking', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-provider-1', role: 'PROVIDER' }) as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({ ...fakeBooking, status: 'CONFIRMED' })
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/bookings/booking-1', 'PATCH', { status: 'CONFIRMED' })
    const res = await bookingByIdPATCH(req, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.booking.status).toBe('CONFIRMED')
  })

  it('allows provider to decline a booking', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-provider-1', role: 'PROVIDER' }) as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({ ...fakeBooking, status: 'DECLINED' })
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/bookings/booking-1', 'PATCH', { status: 'DECLINED' })
    const res = await bookingByIdPATCH(req, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.booking.status).toBe('DECLINED')

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'BOOKING_DECLINED',
          userId: fakeBooking.customerId,
        }),
      }),
    )
  })

  it('allows customer to cancel a booking', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-customer-1', role: 'CUSTOMER' }) as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({ ...fakeBooking, status: 'CANCELLED_BY_CUSTOMER' })
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/bookings/booking-1', 'PATCH', { status: 'CANCELLED_BY_CUSTOMER' })
    const res = await bookingByIdPATCH(req, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.booking.status).toBe('CANCELLED_BY_CUSTOMER')
  })

  it('sends BOOKING_ACCEPTED notification when status is CONFIRMED', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession({ id: 'user-provider-1', role: 'PROVIDER' }) as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)
    ;(mockPrisma.booking.update as jest.Mock).mockResolvedValueOnce({ ...fakeBooking, status: 'CONFIRMED' })
    ;(mockPrisma.notification.create as jest.Mock).mockResolvedValueOnce({})

    const req = makeRequest('http://localhost/api/bookings/booking-1', 'PATCH', { status: 'CONFIRMED' })
    await bookingByIdPATCH(req, { params })

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'BOOKING_ACCEPTED' }),
      }),
    )
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB error'))

    const req = makeRequest('http://localhost/api/bookings/booking-1', 'PATCH', { status: 'CONFIRMED' })
    const res = await bookingByIdPATCH(req, { params })

    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/bookings/[id]', () => {
  const params = { id: 'booking-1' }

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/bookings/booking-1')
    const res = await bookingByIdGET(req, { params })

    expect(res.status).toBe(401)
  })

  it('returns 404 when booking not found', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/bookings/nonexistent')
    const res = await bookingByIdGET(req, { params: { id: 'nonexistent' } })

    expect(res.status).toBe(404)
  })

  it('returns booking detail when found', async () => {
    mockGetServerSession.mockResolvedValueOnce(makeSession() as any)
    const fakeBooking = {
      id: 'booking-1',
      customerId: 'user-customer-1',
      service: { title: 'Gel Manicure' },
      customer: { name: 'Emma' },
      provider: { name: 'Sophie' },
      review: null,
      messages: [],
    }
    ;(mockPrisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(fakeBooking)

    const req = makeRequest('http://localhost/api/bookings/booking-1')
    const res = await bookingByIdGET(req, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.booking.id).toBe('booking-1')
    expect(json.booking.service.title).toBe('Gel Manicure')
  })
})
/* eslint-disable @typescript-eslint/no-explicit-any */
