/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FIND-18 — tip included in artist payout across all three COMPLETED /
 * NO_SHOW paths in PATCH /api/bookings/[id]. Each test asserts the upserted
 * Payout row has amount = totalPrice - platformFee (tip flows through), not
 * the previous tip-less `totalPrice - platformFee - tipAmount`.
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      capture: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture' }),
      cancel: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'canceled' }),
    },
    refunds: { create: jest.fn().mockResolvedValue({ id: 're_test' }) },
  },
}))

jest.mock('@/lib/prisma', () => {
  const prisma: Record<string, unknown> = {
    $transaction: jest.fn((fn) =>
      typeof fn === 'function' ? Promise.resolve(fn(prisma)) : Promise.all(fn),
    ),
    booking: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    service: {
      findUnique: jest.fn().mockResolvedValue({ duration: 60 }),
    },
    availability: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    bookingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    payout: {
      create: jest.fn().mockResolvedValue({ id: 'payout-test' }),
      upsert: jest.fn().mockResolvedValue({ id: 'payout-test' }),
    },
    dispute: { findUnique: jest.fn().mockResolvedValue(null) },
    promoCodeUsage: { findUnique: jest.fn().mockResolvedValue(null) },
    providerProfile: { update: jest.fn().mockResolvedValue({}) },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u-p', name: 'P', email: 'p@x' }),
    },
  }
  return { prisma }
})

jest.mock('@/lib/email', () => ({
  sendBookingConfirmationEmail: jest.fn().mockResolvedValue({}),
  sendBookingDeclinedEmail: jest.fn().mockResolvedValue({}),
  sendBookingCancelledEmail: jest.fn().mockResolvedValue({}),
  sendBookingCompletedEmail: jest.fn().mockResolvedValue({}),
  sendBookingExpiredEmail: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/sms', () => ({
  sendBookingConfirmedSms: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(true),
}))

// ─── Imports (after mocks registered) ───────────────────────────────────────

import { PATCH } from '@/app/api/bookings/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as any

// ─── Fixtures ───────────────────────────────────────────────────────────────

const PROVIDER_ID = 'user-provider-1'
const CUSTOMER_ID = 'user-customer-1'

function makeProviderSession() {
  return {
    user: { id: PROVIDER_ID, role: 'PROVIDER' },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

function makePatchRequest(bookingId: string, status: string) {
  return new NextRequest(`http://localhost/api/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Returns a past appointment time that satisfies the "appointment has ended"
 * guard at bookings/[id]/route.ts:456-476 (provider may only mark COMPLETED
 * within the 5-min grace after appointment end).
 */
function pastAppointment() {
  const d = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2h ago
  return { date: d, time: `${d.getUTCHours().toString().padStart(2, '0')}:00` }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FIND-18 — tip included in artist payout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.payout.upsert.mockResolvedValue({ id: 'payout-test' })
    mockPrisma.booking.update.mockResolvedValue({})
    mockPrisma.service.findUnique.mockResolvedValue({ duration: 60 })
    mockPrisma.dispute.findUnique.mockResolvedValue(null)
  })

  it('COMPLETED (paid booking) — payout amount = totalPrice − platformFee (tip included)', async () => {
    const { date, time } = pastAppointment()
    mockGetServerSession.mockResolvedValueOnce(makeProviderSession() as any)
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: 'b-1',
      customerId: CUSTOMER_ID,
      providerUserId: PROVIDER_ID,
      serviceId: 'svc-1',
      status: 'CONFIRMED',
      date,
      time,
      totalPrice: 120,
      platformFee: 10,
      tipAmount: 15,
      stripePaymentId: 'pi_real_123',
      provider: { providerProfile: { id: 'pp-1' } },
      service: { provider: {} },
      customer: { id: CUSTOMER_ID, name: 'C', email: 'c@x' },
    })

    const res = await PATCH(makePatchRequest('b-1', 'COMPLETED'), { params: { id: 'b-1' } })
    expect(res.status).toBe(200)

    expect(mockPrisma.payout.upsert).toHaveBeenCalledTimes(1)
    const call = mockPrisma.payout.upsert.mock.calls[0][0]
    expect(call.create.amount).toBe(110) // 120 - 10, tip of 15 is now included
    expect(call.create.platformFee).toBe(10)
  })

  it('NO_SHOW — payout amount = totalPrice − platformFee (tip included)', async () => {
    const { date, time } = pastAppointment()
    mockGetServerSession.mockResolvedValueOnce(makeProviderSession() as any)
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: 'b-2',
      customerId: CUSTOMER_ID,
      providerUserId: PROVIDER_ID,
      serviceId: 'svc-1',
      status: 'CONFIRMED',
      date,
      time,
      totalPrice: 80,
      platformFee: 8,
      tipAmount: 12,
      stripePaymentId: 'pi_real_456',
      provider: { providerProfile: { id: 'pp-1' } },
      service: { provider: {} },
      customer: { id: CUSTOMER_ID, name: 'C', email: 'c@x' },
    })

    const res = await PATCH(makePatchRequest('b-2', 'NO_SHOW'), { params: { id: 'b-2' } })
    expect(res.status).toBe(200)

    expect(mockPrisma.payout.upsert).toHaveBeenCalledTimes(1)
    const call = mockPrisma.payout.upsert.mock.calls[0][0]
    expect(call.create.amount).toBe(72) // 80 - 8, tip of 12 is now included
  })

  it('$0 booking (no stripePaymentId) → COMPLETED — payout amount = totalPrice − platformFee', async () => {
    const { date, time } = pastAppointment()
    mockGetServerSession.mockResolvedValueOnce(makeProviderSession() as any)
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: 'b-3',
      customerId: CUSTOMER_ID,
      providerUserId: PROVIDER_ID,
      serviceId: 'svc-1',
      status: 'CONFIRMED',
      date,
      time,
      // Voucher-covered booking: customer paid with voucher, small residual still
      // scheduled as an artist payout. Tip must still flow through.
      totalPrice: 50,
      platformFee: 5,
      tipAmount: 8,
      stripePaymentId: null,
      provider: { providerProfile: { id: 'pp-1' } },
      service: { provider: {} },
      customer: { id: CUSTOMER_ID, name: 'C', email: 'c@x' },
    })

    const res = await PATCH(makePatchRequest('b-3', 'COMPLETED'), { params: { id: 'b-3' } })
    expect(res.status).toBe(200)

    expect(mockPrisma.payout.upsert).toHaveBeenCalledTimes(1)
    const call = mockPrisma.payout.upsert.mock.calls[0][0]
    expect(call.create.amount).toBe(45) // 50 - 5, tip of 8 is now included
  })

  it('zero-tip booking is unchanged (regression guard)', async () => {
    const { date, time } = pastAppointment()
    mockGetServerSession.mockResolvedValueOnce(makeProviderSession() as any)
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: 'b-4',
      customerId: CUSTOMER_ID,
      providerUserId: PROVIDER_ID,
      serviceId: 'svc-1',
      status: 'CONFIRMED',
      date,
      time,
      totalPrice: 100,
      platformFee: 10,
      tipAmount: 0,
      stripePaymentId: 'pi_real_789',
      provider: { providerProfile: { id: 'pp-1' } },
      service: { provider: {} },
      customer: { id: CUSTOMER_ID, name: 'C', email: 'c@x' },
    })

    const res = await PATCH(makePatchRequest('b-4', 'COMPLETED'), { params: { id: 'b-4' } })
    expect(res.status).toBe(200)
    const call = mockPrisma.payout.upsert.mock.calls[0][0]
    expect(call.create.amount).toBe(90) // unchanged — no tip to include/exclude
  })
})
