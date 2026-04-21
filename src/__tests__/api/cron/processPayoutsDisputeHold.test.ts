/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * process-payouts cron — dispute hold path (item #12).
 *
 * BL-6: A pending dispute MUST freeze the provider payout. Money that
 * might flow back to the customer cannot leave the platform first.
 *
 * Exactly which dispute states block is a product decision that has shipped
 * to prod, so we lock it in here as an executable spec:
 *
 *   DISPUTE_BLOCKING_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND']
 *
 *   - OPEN            → hold; investigation hasn't started
 *   - UNDER_REVIEW    → hold; admin actively looking
 *   - RESOLVED_REFUND → hold; money is going back to the customer
 *   - RESOLVED_NO_REFUND → release; artist keeps the money
 *   - CLOSED          → release; no refund decided
 *
 * Separately we also assert the booking-level refund guard: if the booking
 * was refunded (status REFUNDED/DISPUTED, or refundStatus=PROCESSED with
 * full refund), the payout is CANCELLED, not merely held.
 *
 * This suite does NOT re-test the Stripe happy path or the KYC gate —
 * those have their own coverage. Every case here ends in skipped or
 * cancelled, never a transfer.
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/email', () => ({
  sendPayoutEmail: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    transfers: { create: jest.fn() },
  },
}))

jest.mock('@/lib/prisma', () => {
  const prismaStub: any = {
    payout: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    providerProfile: {
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
  }
  prismaStub.$transaction = jest.fn(async (arg: any) => {
    if (typeof arg === 'function') return arg(prismaStub)
    if (Array.isArray(arg)) return Promise.all(arg)
    return arg
  })
  return { prisma: prismaStub }
})

import { GET as processPayoutsGET } from '@/app/api/cron/process-payouts/route'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

const mp = prisma as any
const ms = stripe as any

const ORIGINAL_ENV = { ...process.env }

function cronReq(secret = 'test-secret'): NextRequest {
  return new NextRequest('http://localhost/api/cron/process-payouts', {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  })
}

/** Minimal payout record matching the route's expected include shape. */
function payoutFixture(overrides: any = {}) {
  const { booking: bookingOverride, ...rest } = overrides
  return {
    id: 'payout_1',
    providerId: 'prov_1',
    bookingId: 'book_1',
    amount: 100,
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() - 60_000),
    createdAt: new Date(),
    penaltyExpiresAt: null,
    ...rest,
    booking: {
      id: 'book_1',
      providerId: 'prov_1',
      stripePaymentId: 'pi_1',
      status: 'COMPLETED',
      refundStatus: null,
      refundAmount: null,
      totalPrice: 100,
      tipAmount: 0,
      platformFee: 15,
      service: { title: 'Hair treatment' },
      provider: {
        providerProfile: {
          id: 'pp_1',
          stripeAccountId: 'acct_1',
          stripeChargesEnabled: true,
        },
      },
      dispute: null,
      ...(bookingOverride ?? {}),
    },
  }
}

describe('process-payouts cron — dispute status holds (BL-6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
    // Default: no expired penalties, no active penalties
    mp.payout.findMany.mockResolvedValue([])
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it.each([
    ['OPEN'],
    ['UNDER_REVIEW'],
    ['RESOLVED_REFUND'],
  ])(
    'dispute %s holds the payout (skipped; no transfer, no state change)',
    async (disputeStatus) => {
      mp.payout.findMany.mockResolvedValueOnce([
        payoutFixture({ booking: { dispute: { status: disputeStatus } } }),
      ])

      const res = await processPayoutsGET(cronReq())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ processed: 0, failed: 0, skipped: 1, total: 1 })

      // Critical: a hold must NOT mutate the payout (that would lose the
      // "SCHEDULED" state we need for the next run to retry).
      expect(mp.payout.update).not.toHaveBeenCalled()
      expect(ms.transfers.create).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['RESOLVED_NO_REFUND'],
    ['CLOSED'],
  ])(
    'dispute %s allows the payout to proceed to Stripe transfer',
    async (disputeStatus) => {
      mp.payout.findMany.mockResolvedValueOnce([
        payoutFixture({ booking: { dispute: { status: disputeStatus } } }),
      ])
      ms.transfers.create.mockResolvedValueOnce({ id: 'tr_ok' })

      const res = await processPayoutsGET(cronReq())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.processed).toBe(1)
      expect(body.skipped).toBe(0)
      expect(ms.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // dollars → cents
          currency: 'aud',
          destination: 'acct_1',
        }),
        { idempotencyKey: 'payout_payout_1' },
      )
    },
  )

  it('no dispute at all → payout proceeds', async () => {
    mp.payout.findMany.mockResolvedValueOnce([payoutFixture()])
    ms.transfers.create.mockResolvedValueOnce({ id: 'tr_ok' })
    const res = await processPayoutsGET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(ms.transfers.create).toHaveBeenCalled()
  })
})

describe('process-payouts cron — booking-level refund cancels the payout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
    mp.payout.findMany.mockResolvedValue([])
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it.each([['REFUNDED'], ['DISPUTED']])(
    'booking.status=%s → payout CANCELLED (not just held)',
    async (bookingStatus) => {
      mp.payout.findMany.mockResolvedValueOnce([
        payoutFixture({ booking: { status: bookingStatus } }),
      ])

      const res = await processPayoutsGET(cronReq())
      const body = await res.json()
      expect(body).toEqual({ processed: 0, failed: 0, skipped: 1, total: 1 })

      expect(mp.payout.update).toHaveBeenCalledWith({
        where: { id: 'payout_1' },
        data: { status: 'CANCELLED' },
      })
      expect(ms.transfers.create).not.toHaveBeenCalled()
    },
  )

  it('refundStatus=PROCESSED with full refund → payout CANCELLED', async () => {
    mp.payout.findMany.mockResolvedValueOnce([
      payoutFixture({
        booking: {
          status: 'COMPLETED',
          refundStatus: 'PROCESSED',
          refundAmount: 100,
          totalPrice: 100,
        },
      }),
    ])

    const res = await processPayoutsGET(cronReq())
    const body = await res.json()
    expect(body.skipped).toBe(1)
    expect(mp.payout.update).toHaveBeenCalledWith({
      where: { id: 'payout_1' },
      data: { status: 'CANCELLED' },
    })
    expect(ms.transfers.create).not.toHaveBeenCalled()
  })

  it('refundStatus=PROCESSED with partial refund → payout proceeds (amount already adjusted upstream)', async () => {
    // Partial: refunded $30 of $100 service → artist still gets adjusted payout
    mp.payout.findMany.mockResolvedValueOnce([
      payoutFixture({
        amount: 55, // already adjusted at refund-time
        booking: {
          status: 'COMPLETED',
          refundStatus: 'PROCESSED',
          refundAmount: 30,
          totalPrice: 100,
        },
      }),
    ])
    ms.transfers.create.mockResolvedValueOnce({ id: 'tr_partial' })

    const res = await processPayoutsGET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(ms.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5500 }),
      expect.any(Object),
    )
  })
})

describe('process-payouts cron — auth & empty batch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('401 when CRON_SECRET bearer is missing or wrong', async () => {
    const res = await processPayoutsGET(
      new NextRequest('http://localhost/api/cron/process-payouts', {
        method: 'GET',
        headers: { authorization: 'Bearer wrong' },
      }),
    )
    expect(res.status).toBe(401)
    expect(mp.payout.findMany).not.toHaveBeenCalled()
  })

  it('empty batch returns zeros and runs no transfers', async () => {
    mp.payout.findMany.mockResolvedValueOnce([])
    const res = await processPayoutsGET(cronReq())
    const body = await res.json()
    expect(body).toEqual({ processed: 0, failed: 0, skipped: 0, total: 0 })
    expect(ms.transfers.create).not.toHaveBeenCalled()
  })
})
