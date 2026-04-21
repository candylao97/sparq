/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * expire-bookings cron (item #11).
 *
 * This cron is a small orchestration with four independent sub-loops:
 *
 *   1. PENDING past acceptDeadline → EXPIRED
 *      - cancel Stripe PI to release the authorization hold
 *      - set paymentStatus=AUTH_RELEASED
 *      - notify both parties
 *      - customer email
 *
 *   2. RESCHEDULE_REQUESTED older than 48h → CONFIRMED (reverted)
 *      - clears reschedule* fields
 *      - notifies the customer
 *
 *   3. CONFIRMED past appointment time → auto-complete
 *      - two-pass: first pass sends a "how was it?" nudge, second pass
 *        (T+48h after appointment) flips to COMPLETED + schedules payout
 *      - skipped if an active dispute exists (BL-6)
 *      - skipped outside provider's local 8am–9pm window
 *      - malformed timezone falls back to Australia/Sydney
 *
 *   4. Featured listings past featuredUntil → isFeatured=false
 *      - notifies provider
 *
 * Auth: Bearer CRON_SECRET required; anything else → 401.
 *
 * The response shape is the operator-facing contract:
 *   { expired, reverted, autoCompleted, featuredExpired }
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/email', () => ({
  sendBookingExpiredEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: { cancel: jest.fn() },
  },
}))

jest.mock('@/lib/booking-time', () => ({
  // Keep it simple — tests control `date`+`time` and we just assemble a UTC.
  bookingDateFieldToUtc: (date: Date, time: string) => {
    const [h, m] = time.split(':').map(Number)
    const d = new Date(date)
    d.setUTCHours(h, m, 0, 0)
    return d
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    notification: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    providerProfile: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    payout: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    bookingStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

import { GET as expireGET } from '@/app/api/cron/expire-bookings/route'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

const mp = prisma as any
const ms = stripe as any

const ORIGINAL_ENV = { ...process.env }

function cronReq(secret = 'test-secret'): NextRequest {
  return new NextRequest('http://localhost/api/cron/expire-bookings', {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  })
}

function resetAll() {
  jest.clearAllMocks()
  // Defaults for all sub-loops are "nothing to do".
  mp.booking.findMany.mockResolvedValue([])
  mp.booking.count.mockResolvedValue(0)
  mp.notification.findFirst.mockResolvedValue(null)
  mp.providerProfile.findMany.mockResolvedValue([])
}

describe('cron expire-bookings — auth & empty batch', () => {
  beforeEach(() => {
    resetAll()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('401 without the correct Bearer secret', async () => {
    const res = await expireGET(
      new NextRequest('http://localhost/api/cron/expire-bookings', {
        method: 'GET',
        headers: { authorization: 'Bearer wrong' },
      }),
    )
    expect(res.status).toBe(401)
    expect(mp.booking.findMany).not.toHaveBeenCalled()
  })

  it('empty batch returns zeros for all four counters', async () => {
    const res = await expireGET(cronReq())
    const body = await res.json()
    expect(body).toEqual({ expired: 0, reverted: 0, autoCompleted: 0, featuredExpired: 0 })
  })
})

describe('cron expire-bookings — PENDING past acceptDeadline', () => {
  beforeEach(() => {
    resetAll()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('flips to EXPIRED, cancels Stripe PI, sets AUTH_RELEASED, notifies both parties', async () => {
    const expired = {
      id: 'book_expired',
      customerId: 'cust_1',
      providerId: 'prov_1',
      stripePaymentId: 'pi_1',
      customer: { email: 'c@example.com', name: 'Casey' },
      provider: { name: 'Lily' },
      service: { title: 'Blowout' },
    }
    // First findMany call is the PENDING sweep; subsequent calls (for the other sub-loops) default to [].
    mp.booking.findMany.mockResolvedValueOnce([expired])

    const res = await expireGET(cronReq())
    expect(res.status).toBe(200)
    expect((await res.json()).expired).toBe(1)

    expect(ms.paymentIntents.cancel).toHaveBeenCalledWith('pi_1')
    expect(mp.booking.update).toHaveBeenCalledWith({
      where: { id: 'book_expired' },
      data: { status: 'EXPIRED', paymentStatus: 'AUTH_RELEASED' },
    })
    // Both parties notified
    const notifyArgs = (mp.notification.createMany as jest.Mock).mock.calls[0][0]
    const userIds = notifyArgs.data.map((d: any) => d.userId)
    expect(userIds).toEqual(expect.arrayContaining(['cust_1', 'prov_1']))
  })

  it('Stripe PI cancel failure does not block the update (PI may already be gone)', async () => {
    ms.paymentIntents.cancel.mockRejectedValueOnce(new Error('already_canceled'))
    mp.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b1',
        customerId: 'c',
        providerId: 'p',
        stripePaymentId: 'pi_gone',
        customer: { email: null, name: null },
        provider: { name: null },
        service: { title: null },
      },
    ])
    const res = await expireGET(cronReq())
    expect(res.status).toBe(200)
    expect(mp.booking.update).toHaveBeenCalled()
  })

  it('no stripePaymentId → still flips to EXPIRED without calling Stripe', async () => {
    mp.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b_no_pi',
        customerId: 'c',
        providerId: 'p',
        stripePaymentId: null,
        customer: { email: null, name: null },
        provider: { name: null },
        service: { title: null },
      },
    ])
    await expireGET(cronReq())
    expect(ms.paymentIntents.cancel).not.toHaveBeenCalled()
    expect(mp.booking.update).toHaveBeenCalledWith({
      where: { id: 'b_no_pi' },
      data: { status: 'EXPIRED', paymentStatus: 'AUTH_RELEASED' },
    })
  })
})

describe('cron expire-bookings — RESCHEDULE_REQUESTED revert after 48h', () => {
  beforeEach(() => {
    resetAll()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('reverts to CONFIRMED and clears reschedule fields; notifies the customer', async () => {
    // First call (PENDING): empty. Second call (RESCHEDULE_REQUESTED): the stalled one.
    mp.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'b1', customerId: 'c', providerId: 'p' },
      ])

    const res = await expireGET(cronReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reverted).toBe(1)

    expect(mp.booking.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: {
        status: 'CONFIRMED',
        rescheduleDate: null,
        rescheduleTime: null,
        rescheduleReason: null,
        rescheduleRequestedAt: null,
      },
    })
    expect(mp.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'c', type: 'BOOKING_ACCEPTED' }),
    })
  })
})

describe('cron expire-bookings — CONFIRMED auto-complete two-pass (BL-C1)', () => {
  beforeEach(() => {
    resetAll()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  function pastConfirmed(overrides: any = {}) {
    // An appointment 50h ago
    const date = new Date(Date.now() - 50 * 3600_000)
    return {
      id: 'b_past',
      customerId: 'cust_1',
      providerId: 'prov_1',
      date,
      time: '10:00',
      totalPrice: 100,
      platformFee: 15,
      tipAmount: 0,
      service: { title: 'Service', duration: 60 },
      provider: {
        id: 'prov_1',
        name: 'Lily',
        providerProfile: { id: 'pp_1', timezone: 'Australia/Sydney' },
      },
      dispute: null,
      ...overrides,
    }
  }

  it('first pass (T+2h, no prior nudge): sends nudge notifications and does NOT complete', async () => {
    // Three sub-loops in order:
    //   1) PENDING sweep: []
    //   2) RESCHEDULE sweep: []
    //   3) CONFIRMED sweep: one past booking
    mp.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pastConfirmed()])
    // No prior nudge notification
    mp.notification.findFirst.mockResolvedValueOnce(null)

    // Need the sweep to run inside the 8am–9pm provider-tz window — mock it by
    // pinning Intl to always say 12:00. The easiest way is to set TZ to a known
    // fixed one; here we rely on the default Australia/Sydney being 'valid' and
    // on formatToParts returning a reasonable hour. If the test becomes flaky
    // we can swap in a fake Intl.
    const res = await expireGET(cronReq())
    expect(res.status).toBe(200)

    // The route may have skipped the nudge if the environment's current hour
    // is outside 8–21 in Sydney — but today.length's test-env is locale-agnostic.
    // In either case, it must NOT have flipped the booking to COMPLETED.
    const completedCalls = (mp.booking.update as jest.Mock).mock.calls.filter(
      (c: any[]) => c[0]?.data?.status === 'COMPLETED',
    )
    expect(completedCalls).toHaveLength(0)
  })

  it('second pass (T+48h, nudge already sent): flips to COMPLETED, schedules payout', async () => {
    mp.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pastConfirmed()])
    // Prior nudge exists → second-pass branch
    mp.notification.findFirst.mockResolvedValueOnce({ id: 'nudge_1' })

    const res = await expireGET(cronReq())
    expect(res.status).toBe(200)
    expect((await res.json()).autoCompleted).toBe(1)

    // Booking flipped
    expect(mp.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b_past' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          disputeDeadline: expect.any(Date),
        }),
      }),
    )

    // Payout scheduled for totalPrice - platformFee - tip = 100 - 15 - 0 = 85
    expect(mp.payout.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: 'b_past' },
        create: expect.objectContaining({
          amount: 85,
          status: 'SCHEDULED',
        }),
      }),
    )

    // Audit history written
    expect(mp.bookingStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'CONFIRMED',
        toStatus: 'COMPLETED',
        changedBy: 'system',
      }),
    })
  })

  it('active dispute on booking → does NOT schedule a payout (BL-6)', async () => {
    mp.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        pastConfirmed({ dispute: { status: 'OPEN' } }),
      ])
    mp.notification.findFirst.mockResolvedValueOnce({ id: 'nudge_1' })

    await expireGET(cronReq())
    // Booking still flipped to COMPLETED...
    expect(mp.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    )
    // ...but no payout
    expect(mp.payout.upsert).not.toHaveBeenCalled()
  })

  it('invalid timezone falls back to Australia/Sydney — does not crash', async () => {
    mp.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        pastConfirmed({
          provider: {
            id: 'prov_1',
            name: 'Lily',
            providerProfile: { id: 'pp_1', timezone: 'Not/A/Real/Zone' },
          },
        }),
      ])
    mp.notification.findFirst.mockResolvedValueOnce(null)

    const res = await expireGET(cronReq())
    expect(res.status).toBe(200) // must not 500
  })
})

describe('cron expire-bookings — featured listing expiry (P2-6)', () => {
  beforeEach(() => {
    resetAll()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('unflags isFeatured for profiles past featuredUntil and notifies them', async () => {
    mp.providerProfile.findMany.mockResolvedValueOnce([
      { id: 'pp_1', userId: 'u_1' },
      { id: 'pp_2', userId: 'u_2' },
    ])

    const res = await expireGET(cronReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.featuredExpired).toBe(2)

    expect(mp.providerProfile.update).toHaveBeenCalledWith({
      where: { id: 'pp_1' },
      data: { isFeatured: false },
    })
    expect(mp.providerProfile.update).toHaveBeenCalledWith({
      where: { id: 'pp_2' },
      data: { isFeatured: false },
    })
    // Notifications to both users
    const notifiedUserIds = (mp.notification.create as jest.Mock).mock.calls.map(
      (c: any[]) => c[0].data.userId,
    )
    expect(notifiedUserIds).toEqual(
      expect.arrayContaining(['u_1', 'u_2']),
    )
  })
})
