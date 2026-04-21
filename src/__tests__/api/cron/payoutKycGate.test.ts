/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Payout-time KYC gate (item #16).
 *
 * The only enforced Stripe-Connect / KYC gate in the system lives in the
 * process-payouts cron. Booking create and booking accept do NOT check whether
 * the provider has a linked Stripe account — funds are captured to the
 * platform's own Stripe account and only paid out to the provider after a
 * 48h dispute window.
 *
 * This suite locks the behavior in place:
 *   (a) Cron requires valid CRON_SECRET bearer token
 *   (b) Payout for a provider WITHOUT stripeAccountId is marked FAILED with a
 *       "No Stripe Connect account" reason
 *   (c) Payout for a provider with stripeChargesEnabled=false is SKIPPED
 *       (left SCHEDULED) so it retries after the provider resolves their
 *       Stripe account — and a notification is created
 *   (d) Payout for a provider with both true proceeds to stripe.transfers.create
 */

jest.mock('@/lib/prisma', () => {
  const payout = {
    findMany: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  }
  const notification = { create: jest.fn().mockResolvedValue({}) }
  const user = {
    findUnique: jest.fn().mockResolvedValue({ email: 'prov@example.com', name: 'Prov' }),
  }
  const providerProfile = {
    update: jest.fn().mockResolvedValue({}),
  }
  const prismaStub = {
    payout,
    notification,
    user,
    providerProfile,
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => Promise<unknown>)({
          payout: {
            findMany: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue({}),
          },
          notification,
        })
      }
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[])
      return arg
    }),
  }
  return { prisma: prismaStub }
})
jest.mock('@/lib/stripe', () => ({
  stripe: {
    transfers: {
      create: jest.fn(),
    },
  },
}))
jest.mock('@/lib/email', () => ({
  sendPayoutEmail: jest.fn().mockResolvedValue(undefined),
}))

import { NextRequest } from 'next/server'
import { GET as cronPayoutsGET } from '@/app/api/cron/process-payouts/route'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

const mp = prisma as any
const ms = stripe as any

const ORIGINAL_ENV = { ...process.env }

function cronReq(secret?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (secret) headers.authorization = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/cron/process-payouts', {
    method: 'GET',
    headers,
  })
}

/** Build a scheduled payout record the cron would load. */
function makePayoutRecord(overrides: Partial<{
  stripeAccountId: string | null
  stripeChargesEnabled: boolean
  amount: number
  totalPrice: number
}>): Record<string, any> {
  return {
    id: 'payout-1',
    bookingId: 'b1',
    providerId: 'prov-1',
    amount: overrides.amount ?? 100,
    platformFee: 15,
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() - 60_000),
    booking: {
      id: 'b1',
      totalPrice: overrides.totalPrice ?? 115,
      status: 'COMPLETED',
      refundStatus: null,
      refundAmount: null,
      stripePaymentId: 'pi_test',
      provider: {
        providerProfile: {
          id: 'pp-1',
          stripeAccountId: overrides.stripeAccountId === undefined ? 'acct_xxx' : overrides.stripeAccountId,
          stripeChargesEnabled: overrides.stripeChargesEnabled === undefined ? true : overrides.stripeChargesEnabled,
        },
      },
      service: { title: 'Facial Treatment' },
      dispute: null,
    },
  }
}

describe('cron process-payouts — auth gate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'correct-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('rejects request without authorization header', async () => {
    const res = await cronPayoutsGET(cronReq())
    expect(res.status).toBe(401)
    expect(mp.payout.findMany).not.toHaveBeenCalled()
  })

  it('rejects request with wrong secret', async () => {
    const res = await cronPayoutsGET(cronReq('wrong'))
    expect(res.status).toBe(401)
    expect(mp.payout.findMany).not.toHaveBeenCalled()
  })

  it('accepts request with correct secret', async () => {
    mp.payout.findMany.mockResolvedValueOnce([])
    const res = await cronPayoutsGET(cronReq('correct-secret'))
    expect(res.status).toBe(200)
    expect(mp.payout.findMany).toHaveBeenCalled()
  })
})

describe('cron process-payouts — Stripe Connect / KYC gates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret' }
  })
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it('marks FAILED when provider has NO stripeAccountId', async () => {
    const payout = makePayoutRecord({ stripeAccountId: null })
    mp.payout.findMany
      .mockResolvedValueOnce([payout])
      .mockResolvedValue([])

    const res = await cronPayoutsGET(cronReq('test-secret'))
    expect(res.status).toBe(200)

    expect(mp.payout.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: expect.objectContaining({
        status: 'FAILED',
        failureReason: 'No Stripe Connect account',
        failedAt: expect.any(Date),
      }),
    })
    expect(ms.transfers.create).not.toHaveBeenCalled()
  })

  it('SKIPS (leaves SCHEDULED) when stripeChargesEnabled=false', async () => {
    const payout = makePayoutRecord({ stripeChargesEnabled: false })
    mp.payout.findMany
      .mockResolvedValueOnce([payout])  // initial SCHEDULED payout load
      .mockResolvedValue([])            // expired-penalty lookups (positive amount path)

    const res = await cronPayoutsGET(cronReq('test-secret'))
    expect(res.status).toBe(200)

    // Should NOT mark FAILED — must retry on next cron run
    const updateCalls = (mp.payout.update as jest.Mock).mock.calls
    const failedCall = updateCalls.find((c) => c[0]?.data?.status === 'FAILED')
    expect(failedCall).toBeUndefined()

    // No transfer attempted
    expect(ms.transfers.create).not.toHaveBeenCalled()

    // Provider IS notified
    expect(mp.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'prov-1',
          title: expect.stringMatching(/action required/i),
        }),
      }),
    )

    const body = await res.json()
    expect(body.skipped).toBeGreaterThanOrEqual(1)
  })

  it('proceeds to stripe.transfers.create when stripeAccountId + chargesEnabled both set', async () => {
    const payout = makePayoutRecord({
      stripeAccountId: 'acct_happy',
      stripeChargesEnabled: true,
    })
    mp.payout.findMany
      .mockResolvedValueOnce([payout])
      .mockResolvedValue([])
    ms.transfers.create.mockResolvedValueOnce({ id: 'tr_success' })
    mp.payout.update.mockResolvedValue({})

    const res = await cronPayoutsGET(cronReq('test-secret'))
    expect(res.status).toBe(200)

    expect(ms.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000, // $100 → cents
        currency: 'aud',
        destination: 'acct_happy',
        metadata: expect.objectContaining({
          bookingId: 'b1',
          payoutId: 'payout-1',
        }),
      }),
      expect.objectContaining({
        idempotencyKey: 'payout_payout-1',
      }),
    )
  })

  it('SKIPS payout when booking has OPEN dispute (KYC irrelevant if dispute blocks)', async () => {
    const payout = makePayoutRecord({})
    payout.booking.dispute = { status: 'OPEN' }
    mp.payout.findMany.mockResolvedValueOnce([payout])

    await cronPayoutsGET(cronReq('test-secret'))

    // Should not even reach KYC/Stripe gate
    expect(ms.transfers.create).not.toHaveBeenCalled()
    // Nor should we mark it failed
    const updateCalls = (mp.payout.update as jest.Mock).mock.calls
    const failedCall = updateCalls.find((c) => c[0]?.data?.status === 'FAILED')
    expect(failedCall).toBeUndefined()
  })

  it('cancels payout when booking already REFUNDED (regardless of KYC)', async () => {
    const payout = makePayoutRecord({})
    payout.booking.status = 'REFUNDED'
    mp.payout.findMany.mockResolvedValueOnce([payout])

    await cronPayoutsGET(cronReq('test-secret'))

    expect(mp.payout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payout-1' },
        data: { status: 'CANCELLED' },
      }),
    )
    expect(ms.transfers.create).not.toHaveBeenCalled()
  })
})
