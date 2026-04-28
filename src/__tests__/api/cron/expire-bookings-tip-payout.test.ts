/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FIND-18 — the auto-expire cron must include the tip in the artist payout
 * amount, matching the manual COMPLETED path in PATCH /api/bookings/[id].
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      cancel: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'canceled' }),
    },
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue({ id: 'n-nudged' }), // nudge already sent → take the auto-complete path
    },
    payout: {
      upsert: jest.fn().mockResolvedValue({ id: 'payout-test' }),
    },
    providerProfile: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    bookingStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

jest.mock('@/lib/email', () => ({
  sendBookingExpiredEmail: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/booking-time', () => ({
  // Return the appointment time far enough in the past that both the
  // T+duration nudge window AND the T+48h auto-complete window have lapsed.
  bookingDateFieldToUtc: jest.fn(() => new Date(Date.now() - 72 * 60 * 60 * 1000)),
}))

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { GET } from '@/app/api/cron/expire-bookings/route'
import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as any

const OLD_ENV = process.env
beforeAll(() => {
  process.env = { ...OLD_ENV, CRON_SECRET: 'test-secret' }
})
afterAll(() => {
  process.env = OLD_ENV
})

function makeCronRequest() {
  return new NextRequest('http://localhost/api/cron/expire-bookings', {
    method: 'GET',
    headers: { authorization: 'Bearer test-secret' },
  })
}

// ─── Test ───────────────────────────────────────────────────────────────────

describe('FIND-18 — expire-bookings cron includes tip in artist payout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n-nudged' })
    mockPrisma.payout.upsert.mockResolvedValue({ id: 'payout-test' })
  })

  it('auto-complete path sets amount = totalPrice - platformFee (tip flows through)', async () => {
    // First findMany: PENDING bookings with lapsed acceptDeadline → empty.
    // Second findMany: stalled RESCHEDULE_REQUESTED → empty.
    // Third findMany: past CONFIRMED bookings → one tip-bearing booking.
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([]) // expired PENDING
      .mockResolvedValueOnce([]) // stalled RESCHEDULE_REQUESTED
      .mockResolvedValueOnce([   // past CONFIRMED
        {
          id: 'b-cron-1',
          customerId: 'user-c',
          providerUserId: 'user-p',
          status: 'CONFIRMED',
          date: new Date(Date.now() - 72 * 60 * 60 * 1000),
          time: '10:00',
          totalPrice: 200,
          platformFee: 20,
          tipAmount: 25,
          stripePaymentId: 'pi_xx',
          provider: {
            id: 'user-p',
            name: 'Artist',
            providerProfile: { id: 'pp-1', timezone: 'Australia/Sydney' },
          },
          service: { title: 'Gel nails', duration: 60 },
          dispute: null,
        },
      ])

    const res = await GET(makeCronRequest())
    expect(res.status).toBe(200)

    expect(mockPrisma.payout.upsert).toHaveBeenCalledTimes(1)
    const call = mockPrisma.payout.upsert.mock.calls[0][0]
    // Tip of 25 is now included in the artist payout.
    expect(call.create.amount).toBe(180) // 200 - 20, not 200 - 20 - 25
    expect(call.create.platformFee).toBe(20)
    expect(call.create.bookingId).toBe('b-cron-1')
  })
})
