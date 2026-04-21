/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Stripe PaymentIntent lifecycle on booking transitions (item #3).
 *
 * Covers the critical seam between booking status changes and PI side
 * effects:
 *
 *   PENDING   → CONFIRMED   : stripe.paymentIntents.capture(id), paymentStatus = CAPTURED
 *   PENDING   → DECLINED    : cancel PI hold,                   paymentStatus = AUTH_RELEASED
 *   PENDING   → EXPIRED     : cancel PI hold,                   paymentStatus = AUTH_RELEASED
 *   *         → CANCELLED_BY_CUSTOMER (pre-capture): cancel hold,  paymentStatus = AUTH_RELEASED
 *   *         → CANCELLED_BY_CUSTOMER (post-capture): refund full, paymentStatus = REFUNDED
 *   *         → CANCELLED_BY_PROVIDER (pre-capture): cancel hold,  paymentStatus = AUTH_RELEASED
 *   CONFIRMED → COMPLETED   : no PI side effect; schedule payout record
 *   COMPLETED → REFUNDED    : full refund,                      paymentStatus = REFUNDED
 *
 * These are the invariants the capture / refund ledger depends on. A regression
 * that skips stripe.paymentIntents.capture on CONFIRMED would mean the platform
 * never collects revenue.
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      capture: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
      cancel: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'canceled' }),
      retrieve: jest.fn(),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_test' }),
    },
  },
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    bookingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    notification: { create: jest.fn().mockResolvedValue({}) },
    payout: { create: jest.fn().mockResolvedValue({}) },
    giftVoucher: { updateMany: jest.fn().mockResolvedValue({}) },
  },
}))

import { PATCH as bookingPATCH } from '@/app/api/bookings/[id]/route'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { makeSession, mockSession } from '@/__tests__/helpers/sessionMock'

const mp = prisma as any
const ms = stripe as any

function patchReq(status: string): NextRequest {
  return new NextRequest('http://localhost/api/bookings/b1', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { 'Content-Type': 'application/json' },
  })
}

function baseBooking(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'b1',
    providerId: 'prov-1',
    customerId: 'cust-1',
    status: 'PENDING',
    stripePaymentId: 'pi_test_123',
    totalPrice: 100,
    platformFee: 15,
    service: { id: 's1', provider: { id: 'pp-1' } },
    provider: { providerProfile: { id: 'pp-1' } },
    ...overrides,
  }
}

describe('PENDING → CONFIRMED (provider accepts) captures the PI', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls stripe.paymentIntents.capture with the PI id', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))

    const res = await bookingPATCH(patchReq('CONFIRMED'), { params: { id: 'b1' } })
    expect(res.status).toBe(200)
    expect(ms.paymentIntents.capture).toHaveBeenCalledWith('pi_test_123')
    expect(ms.paymentIntents.cancel).not.toHaveBeenCalled()
    expect(ms.refunds.create).not.toHaveBeenCalled()
  })

  it('sets paymentStatus=CAPTURED on the booking', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))

    await bookingPATCH(patchReq('CONFIRMED'), { params: { id: 'b1' } })
    expect(mp.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          paymentStatus: 'CAPTURED',
        }),
      }),
    )
  })

  it('does NOT capture when booking has no stripePaymentId ($0 voucher booking)', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ stripePaymentId: null }))

    const res = await bookingPATCH(patchReq('CONFIRMED'), { params: { id: 'b1' } })
    expect(res.status).toBe(200)
    expect(ms.paymentIntents.capture).not.toHaveBeenCalled()
  })
})

describe('PENDING → DECLINED / EXPIRED releases the hold', () => {
  beforeEach(() => jest.clearAllMocks())

  it('DECLINED cancels the PaymentIntent and sets AUTH_RELEASED', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))

    await bookingPATCH(patchReq('DECLINED'), { params: { id: 'b1' } })
    expect(ms.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123')
    expect(ms.paymentIntents.capture).not.toHaveBeenCalled()
    expect(mp.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DECLINED',
          paymentStatus: 'AUTH_RELEASED',
        }),
      }),
    )
  })

  it('EXPIRED cancels the PaymentIntent (admin-triggered expiry)', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))

    await bookingPATCH(patchReq('EXPIRED'), { params: { id: 'b1' } })
    expect(ms.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123')
  })

  it('does not throw if the PI is already cancelled (idempotent)', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))
    ms.paymentIntents.cancel.mockRejectedValueOnce(new Error('already canceled'))

    const res = await bookingPATCH(patchReq('DECLINED'), { params: { id: 'b1' } })
    // Route swallows the cancel error — the booking still transitions
    expect(res.status).toBe(200)
  })
})

describe('CANCELLED_BY_CUSTOMER — branches on PI state', () => {
  beforeEach(() => jest.clearAllMocks())

  it('pre-capture (requires_capture) cancels the hold', async () => {
    mockSession(makeSession({ id: 'cust-1', role: 'CUSTOMER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ id: 'pi_test_123', status: 'requires_capture' })

    await bookingPATCH(patchReq('CANCELLED_BY_CUSTOMER'), { params: { id: 'b1' } })
    expect(ms.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123')
    expect(ms.refunds.create).not.toHaveBeenCalled()
    expect(mp.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: 'AUTH_RELEASED',
        }),
      }),
    )
  })

  it('post-capture (succeeded) issues a full refund', async () => {
    mockSession(makeSession({ id: 'cust-1', role: 'CUSTOMER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'CONFIRMED' }))
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ id: 'pi_test_123', status: 'succeeded' })

    await bookingPATCH(patchReq('CANCELLED_BY_CUSTOMER'), { params: { id: 'b1' } })
    expect(ms.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_test_123' })
    expect(ms.paymentIntents.cancel).not.toHaveBeenCalled()
    expect(mp.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: 'REFUNDED',
          refundStatus: 'PROCESSED',
          refundAmount: 100,
        }),
      }),
    )
  })
})

describe('CANCELLED_BY_PROVIDER — branches on PI state', () => {
  beforeEach(() => jest.clearAllMocks())

  it('pre-capture cancels the hold', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ id: 'pi_test_123', status: 'requires_capture' })

    await bookingPATCH(patchReq('CANCELLED_BY_PROVIDER'), { params: { id: 'b1' } })
    expect(ms.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123')
    expect(ms.refunds.create).not.toHaveBeenCalled()
  })

  it('post-capture refunds', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'CONFIRMED' }))
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ id: 'pi_test_123', status: 'succeeded' })

    await bookingPATCH(patchReq('CANCELLED_BY_PROVIDER'), { params: { id: 'b1' } })
    expect(ms.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_test_123' })
  })
})

describe('CONFIRMED → COMPLETED — schedules payout, no PI side effect', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does NOT touch PI and creates a SCHEDULED payout record', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'CONFIRMED' }))

    await bookingPATCH(patchReq('COMPLETED'), { params: { id: 'b1' } })
    expect(ms.paymentIntents.capture).not.toHaveBeenCalled()
    expect(ms.paymentIntents.cancel).not.toHaveBeenCalled()
    expect(ms.refunds.create).not.toHaveBeenCalled()

    expect(mp.payout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: 'b1',
          providerId: 'pp-1',
          amount: 85, // totalPrice (100) - platformFee (15)
          platformFee: 15,
          status: 'SCHEDULED',
        }),
      }),
    )
    // completedAt + 48h disputeDeadline set
    const updateCall = (mp.booking.update as jest.Mock).mock.calls[0][0]
    expect(updateCall.data.completedAt).toBeInstanceOf(Date)
    expect(updateCall.data.disputeDeadline).toBeInstanceOf(Date)
  })
})

describe('COMPLETED → REFUNDED — full refund', () => {
  beforeEach(() => jest.clearAllMocks())

  it('admin REFUNDED issues stripe.refunds.create and updates booking', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'COMPLETED' }))

    await bookingPATCH(patchReq('REFUNDED'), { params: { id: 'b1' } })
    expect(ms.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_test_123' })
    expect(mp.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
          refundStatus: 'PROCESSED',
          refundAmount: 100,
        }),
      }),
    )
  })
})

describe('CONFIRMED capture failure blocks the transition', () => {
  beforeEach(() => jest.clearAllMocks())

  it('when stripe.paymentIntents.capture throws, booking does NOT move to CONFIRMED', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce(baseBooking({ status: 'PENDING' }))
    ms.paymentIntents.capture.mockRejectedValueOnce(new Error('card_declined'))

    const res = await bookingPATCH(patchReq('CONFIRMED'), { params: { id: 'b1' } })
    // Route returns 500 or 400 — the critical invariant is that booking is not updated
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(mp.booking.update).not.toHaveBeenCalled()
  })
})
