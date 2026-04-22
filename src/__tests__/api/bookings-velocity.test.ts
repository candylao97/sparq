/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AUDIT-017 — Velocity checks on high-value booking endpoints.
 *
 * Locks in the 429 behaviour for:
 *   - POST   /api/bookings                 (IP + user tier)
 *   - PATCH  /api/bookings/[id]            (user tier)
 *   - POST   /api/bookings/[id]/reschedule (user tier)
 *
 * Strategy: mock `@/lib/rate-limit` per test to return false for the
 * target tier, assert 429 + correct error copy + that the handler
 * short-circuits before touching Prisma.
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

// Prisma is never reached when the gate trips, but the route imports it
// at module load so we need the mock to be there.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    service: { findUnique: jest.fn() },
    customerProfile: { findUnique: jest.fn() },
    giftVoucher: { findUnique: jest.fn(), updateMany: jest.fn() },
    availability: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
    bookingStatusHistory: { create: jest.fn() },
    payout: { create: jest.fn() },
    contactLeakageFlag: { create: jest.fn() },
  },
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: { create: jest.fn(), capture: jest.fn(), cancel: jest.fn(), retrieve: jest.fn() },
    refunds: { create: jest.fn() },
  },
}))

jest.mock('@/lib/content-filter', () => ({
  filterContactInfo: jest.fn().mockReturnValue({ text: '', flagged: false, flagType: null, matches: [] }),
}))

jest.mock('@/lib/utils', () => ({
  getCommissionRate: jest.fn().mockReturnValue(0.15),
  calculatePlatformFee: jest.fn().mockReturnValue(10),
}))

// Under test — always start allowing everything, then flip per test.
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(true),
}))

// Other emails / sms that PATCH pulls in. Just no-op them.
jest.mock('@/lib/email', () => ({
  sendBookingConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendBookingDeclinedEmail: jest.fn().mockResolvedValue(undefined),
  sendBookingCancelledEmail: jest.fn().mockResolvedValue(undefined),
  sendDisputeOpenedEmail: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/sms', () => ({
  sendBookingConfirmedSms: jest.fn().mockResolvedValue(undefined),
}))

import { POST as bookingsPOST } from '@/app/api/bookings/route'
import { PATCH as bookingByIdPATCH } from '@/app/api/bookings/[id]/route'
import { POST as reschedulePOST } from '@/app/api/bookings/[id]/reschedule/route'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

const mockSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const session = {
  user: { id: 'user-1', role: 'CUSTOMER' },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
}

// Build a NextRequest with the given method / body / headers.
function makeReq(
  url: string,
  method: string,
  opts: { body?: object; ip?: string } = {},
): NextRequest {
  // Use `any` for the init — Next's RequestInit is stricter than the DOM one.
  const init: any = { method }
  if (opts.body) {
    init.body = JSON.stringify(opts.body)
    init.headers = {
      'Content-Type': 'application/json',
      ...(opts.ip ? { 'x-forwarded-for': opts.ip } : {}),
    }
  } else if (opts.ip) {
    init.headers = { 'x-forwarded-for': opts.ip }
  }
  return new NextRequest(url, init)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRateLimit.mockResolvedValue(true)
  mockSession.mockResolvedValue(session as any)
})

describe('POST /api/bookings — velocity (AUDIT-017)', () => {
  const bodyShell = {
    serviceId: 'svc-1',
    date: '2099-12-31',
    time: '10:00',
    locationType: 'AT_HOME',
  }

  it('returns 429 when the IP-tier limit is exceeded', async () => {
    // First call (IP tier) returns false.
    mockRateLimit.mockResolvedValueOnce(false)

    const req = makeReq('http://localhost/api/bookings', 'POST', {
      body: bodyShell,
      ip: '1.2.3.4',
    })
    const res = await bookingsPOST(req)

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/too many booking requests from your network/i)
    // Must short-circuit before Prisma.
    expect(mockPrisma.service.findUnique).not.toHaveBeenCalled()
    // Only one call (IP tier) happens when it fails.
    expect(mockRateLimit).toHaveBeenCalledTimes(1)
    expect(mockRateLimit).toHaveBeenCalledWith(
      'booking-create-ip:1.2.3.4',
      30,
      3600,
    )
  })

  it('returns 429 when the user-tier limit is exceeded (IP passes)', async () => {
    // IP allowed, user blocked.
    mockRateLimit
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const req = makeReq('http://localhost/api/bookings', 'POST', {
      body: bodyShell,
      ip: '1.2.3.4',
    })
    const res = await bookingsPOST(req)

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/too many booking requests\. please wait/i)
    expect(mockPrisma.service.findUnique).not.toHaveBeenCalled()
    expect(mockRateLimit).toHaveBeenCalledTimes(2)
    expect(mockRateLimit).toHaveBeenNthCalledWith(
      2,
      'booking-create-user:user-1',
      10,
      3600,
    )
  })

  it('uses "unknown" when x-forwarded-for is missing', async () => {
    mockRateLimit.mockResolvedValueOnce(false)

    const req = makeReq('http://localhost/api/bookings', 'POST', {
      body: bodyShell,
    })
    await bookingsPOST(req)

    expect(mockRateLimit).toHaveBeenCalledWith(
      'booking-create-ip:unknown',
      30,
      3600,
    )
  })

  it('does not rate-limit unauthenticated requests (401 returns first)', async () => {
    mockSession.mockResolvedValueOnce(null)

    const req = makeReq('http://localhost/api/bookings', 'POST', {
      body: bodyShell,
    })
    const res = await bookingsPOST(req)

    expect(res.status).toBe(401)
    expect(mockRateLimit).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/bookings/[id] — velocity (AUDIT-017)', () => {
  it('returns 429 when the user-tier limit is exceeded', async () => {
    mockRateLimit.mockResolvedValueOnce(false)

    const req = makeReq('http://localhost/api/bookings/abc', 'PATCH', {
      body: { status: 'CONFIRMED' },
    })
    const res = await bookingByIdPATCH(req, { params: { id: 'abc' } })

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/too many booking updates/i)
    expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled()
    expect(mockRateLimit).toHaveBeenCalledWith(
      'booking-patch:user-1',
      60,
      3600,
    )
  })
})

describe('POST /api/bookings/[id]/reschedule — velocity (AUDIT-017)', () => {
  it('returns 429 when the user-tier limit is exceeded', async () => {
    mockRateLimit.mockResolvedValueOnce(false)

    const req = makeReq('http://localhost/api/bookings/abc/reschedule', 'POST', {
      body: { date: '2099-12-31', time: '10:00' },
    })
    const res = await reschedulePOST(req, { params: { id: 'abc' } })

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/too many reschedule requests/i)
    expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled()
    expect(mockRateLimit).toHaveBeenCalledWith(
      'booking-reschedule:user-1',
      10,
      3600,
    )
  })
})
