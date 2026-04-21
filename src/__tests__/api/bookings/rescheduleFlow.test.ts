/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Booking reschedule flow (item #8).
 *
 * POST /api/bookings/[id]/reschedule is the only route that resets a
 * booking's payment state — it cancels the old PaymentIntent (or refunds
 * if already captured) and creates a fresh one. Getting this wrong risks
 * charging the customer twice (old authorization held + new authorization)
 * or losing the authorization entirely.
 *
 * Covered:
 *   - Validation: date/time format, not in the past
 *   - AuthZ: only the booking's customer or provider can reschedule
 *   - Lifecycle: only PENDING or CONFIRMED bookings are reschedulable
 *   - Stripe branching:
 *       pi.status=requires_capture → cancel (release the hold)
 *       pi.status=succeeded         → refund (CONFIRMED already captured)
 *       Stripe error                → swallowed, flow continues (hold expires)
 *   - Booking reset: status→PENDING, stripePaymentId→null, new 24h deadline
 *   - New PI created on totalPrice > 0; $0 booking skips new PI
 *   - clientSecret returned to the caller for the new PI
 *   - Other party gets notified
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      retrieve: jest.fn(),
      cancel: jest.fn(),
      create: jest.fn(),
    },
    refunds: { create: jest.fn() },
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'book_1' }),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

import { POST as reschedulePOST } from '@/app/api/bookings/[id]/reschedule/route'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getServerSession } from 'next-auth'

const mp = prisma as any
const ms = stripe as any
const mockGetSession = getServerSession as jest.MockedFunction<typeof getServerSession>

function rescheduleReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/bookings/book_1/reschedule', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function bookingFixture(overrides: any = {}) {
  return {
    id: 'book_1',
    customerId: 'cust_1',
    providerId: 'prov_1',
    status: 'PENDING',
    stripePaymentId: 'pi_1',
    totalPrice: 200,
    service: { id: 'svc_1', title: 'Hair treatment' },
    ...overrides,
  }
}

// Pick a date tomorrow to always stay in-range.
const TOMORROW_ISO = new Date(Date.now() + 2 * 86400_000).toISOString().split('T')[0]

describe('POST /api/bookings/[id]/reschedule — authZ & validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'cust_1', role: 'CUSTOMER' },
    } as any)
  })

  it('401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '10:00' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(401)
  })

  it('400 when date or time is missing', async () => {
    const res1 = await reschedulePOST(
      rescheduleReq({ time: '10:00' }),
      { params: { id: 'book_1' } },
    )
    expect(res1.status).toBe(400)

    const res2 = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO }),
      { params: { id: 'book_1' } },
    )
    expect(res2.status).toBe(400)
  })

  it('400 when time is not HH:MM', async () => {
    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '10am' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/HH:MM/i)
  })

  it('400 when date is in the past', async () => {
    const past = new Date(Date.now() - 86400_000).toISOString().split('T')[0]
    const res = await reschedulePOST(
      rescheduleReq({ date: past, time: '10:00' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/past/i)
  })

  it('400 when date is not parseable', async () => {
    const res = await reschedulePOST(
      rescheduleReq({ date: 'not-a-date', time: '10:00' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(400)
  })

  it('404 when booking does not exist', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(null)
    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '10:00' }),
      { params: { id: 'missing' } },
    )
    expect(res.status).toBe(404)
  })

  it('403 when caller is neither customer nor provider of the booking', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'stranger', role: 'CUSTOMER' },
    } as any)
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture())

    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '10:00' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(403)
  })

  it.each([
    ['COMPLETED'],
    ['CANCELLED_BY_CUSTOMER'],
    ['CANCELLED_BY_PROVIDER'],
    ['DECLINED'],
    ['DISPUTED'],
    ['EXPIRED'],
  ])('400 when booking.status=%s (only PENDING/CONFIRMED are reschedulable)', async (status) => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture({ status }))
    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '10:00' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Cannot reschedule/i)
  })
})

describe('POST /api/bookings/[id]/reschedule — Stripe state branching', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'cust_1', role: 'CUSTOMER' },
    } as any)
    ms.paymentIntents.create.mockResolvedValue({
      id: 'pi_new',
      client_secret: 'cs_new_secret',
    })
  })

  it('PENDING booking (requires_capture): cancels the hold, creates new PI, returns clientSecret', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture({ status: 'PENDING' }))
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'requires_capture' })

    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(200)

    expect(ms.paymentIntents.cancel).toHaveBeenCalledWith('pi_1')
    expect(ms.refunds.create).not.toHaveBeenCalled()

    // New PI created with the same totalPrice ($200 → 20000 cents) and manual capture
    expect(ms.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 20000,
        currency: 'aud',
        capture_method: 'manual',
        metadata: expect.objectContaining({ bookingId: 'book_1' }),
      }),
    )

    // clientSecret surfaced to the caller so the UI can re-auth the card
    const body = await res.json()
    expect(body.clientSecret).toBe('cs_new_secret')
  })

  it('CONFIRMED booking (succeeded): refunds old capture, creates new PI', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture({ status: 'CONFIRMED' }))
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })

    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(200)

    expect(ms.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' })
    expect(ms.paymentIntents.cancel).not.toHaveBeenCalled()
    expect(ms.paymentIntents.create).toHaveBeenCalled()
  })

  it('Stripe retrieve fails: swallows error, still resets booking and creates new PI', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture())
    ms.paymentIntents.retrieve.mockRejectedValueOnce(new Error('network'))

    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(200)
    // Old hold couldn't be cancelled, but flow continues — hold expires naturally.
    expect(mp.booking.update).toHaveBeenCalled()
    expect(ms.paymentIntents.create).toHaveBeenCalled()
  })

  it('booking with no stripePaymentId: skips PI retrieve/cancel', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(
      bookingFixture({ stripePaymentId: null }),
    )

    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(200)
    expect(ms.paymentIntents.retrieve).not.toHaveBeenCalled()
    expect(ms.paymentIntents.cancel).not.toHaveBeenCalled()
    expect(ms.refunds.create).not.toHaveBeenCalled()
  })

  it('$0 booking (voucher-covered): skips new PI creation; clientSecret is null', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(
      bookingFixture({ totalPrice: 0, stripePaymentId: null }),
    )
    const res = await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clientSecret).toBeNull()
    expect(ms.paymentIntents.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/bookings/[id]/reschedule — booking reset & notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'cust_1', role: 'CUSTOMER' },
    } as any)
    ms.paymentIntents.retrieve.mockResolvedValue({ status: 'requires_capture' })
    ms.paymentIntents.create.mockResolvedValue({
      id: 'pi_new',
      client_secret: 'cs_new',
    })
  })

  it('resets booking to PENDING with null stripePaymentId and a 24h acceptDeadline', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture({ status: 'CONFIRMED' }))
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })

    await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )

    const firstUpdate = (mp.booking.update as jest.Mock).mock.calls[0][0]
    expect(firstUpdate.data.status).toBe('PENDING')
    expect(firstUpdate.data.stripePaymentId).toBeNull()
    expect(firstUpdate.data.time).toBe('11:30')
    // 24h deadline
    const deadline: Date = firstUpdate.data.acceptDeadline
    const diffH = (deadline.getTime() - Date.now()) / 3600_000
    expect(diffH).toBeGreaterThan(23.9)
    expect(diffH).toBeLessThan(24.1)
  })

  it('customer reschedules → provider gets the notification', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture())
    await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )
    expect(mp.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'prov_1',
        type: 'NEW_BOOKING',
        message: expect.stringMatching(/client/i),
      }),
    })
  })

  it('provider reschedules → customer gets the notification', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'prov_1', role: 'PROVIDER' },
    } as any)
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture())

    await reschedulePOST(
      rescheduleReq({ date: TOMORROW_ISO, time: '11:30' }),
      { params: { id: 'book_1' } },
    )
    expect(mp.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'cust_1',
        message: expect.stringMatching(/artist/i),
      }),
    })
  })
})
