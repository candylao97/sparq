/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AUDIT-021 — Tests for POST /api/cron/reconcile-payments
 *
 * Strategy: mock @/lib/stripe.paymentIntents.retrieve and @/lib/prisma,
 * seed a handful of AUTH_PENDING bookings covering every Stripe PI status
 * the cron knows how to reconcile, and verify the correct DB write.
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      retrieve: jest.fn(),
    },
  },
}))

jest.mock('@/lib/prisma', () => {
  const booking = {
    findMany: jest.fn(),
    update: jest.fn(),
  }
  const processedWebhookEvent = { create: jest.fn() }
  const notification = { create: jest.fn() }
  const giftVoucher = { findUnique: jest.fn(), update: jest.fn() }
  const $transaction = jest.fn(async (arg: any) => {
    if (typeof arg === 'function') {
      // Callback form: pass a mock tx client with the same models the
      // production code touches inside the transaction.
      const tx = {
        processedWebhookEvent,
        booking,
        giftVoucher,
      }
      return await arg(tx)
    }
    // Array form: just resolve the promises sequentially.
    return Promise.all(arg)
  })
  return {
    prisma: {
      booking,
      processedWebhookEvent,
      notification,
      giftVoucher,
      $transaction,
    },
  }
})

// ─── Imports (after mocks are registered) ───────────────────────────────────

import { POST } from '@/app/api/cron/reconcile-payments/route'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

const mockRetrieve = stripe.paymentIntents.retrieve as jest.Mock
const mockPrisma = prisma as any

// ─── Helpers ────────────────────────────────────────────────────────────────

const OLD_ENV = process.env
beforeAll(() => {
  process.env = { ...OLD_ENV, CRON_SECRET: 'test-cron-secret' }
})
afterAll(() => {
  process.env = OLD_ENV
})

beforeEach(() => {
  jest.resetAllMocks()
  // Re-establish the $transaction default implementation after resetAllMocks
  // wiped it.
  mockPrisma.$transaction.mockImplementation(async (arg: any) => {
    if (typeof arg === 'function') {
      const tx = {
        processedWebhookEvent: mockPrisma.processedWebhookEvent,
        booking: mockPrisma.booking,
        giftVoucher: mockPrisma.giftVoucher,
      }
      return await arg(tx)
    }
    return Promise.all(arg)
  })
})

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader) headers['authorization'] = authHeader
  return new NextRequest('http://localhost/api/cron/reconcile-payments', {
    method: 'POST',
    headers,
  })
}

function pi(status: string, id = 'pi_test_123'): any {
  return { id, status }
}

function booking(overrides: Record<string, any> = {}): any {
  return {
    id: 'booking-1',
    customerId: 'customer-1',
    providerId: 'provider-1',
    status: 'PENDING',
    paymentStatus: 'AUTH_PENDING',
    stripePaymentId: 'pi_test_123',
    totalPrice: 100,
    giftVoucherCode: null,
    createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 min old
    provider: {
      providerProfile: { tier: 'NEWCOMER', stripeSubscriptionStatus: null },
    },
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/cron/reconcile-payments — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([])
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(mockRetrieve).not.toHaveBeenCalled()
  })

  it('returns 401 when CRON_SECRET mismatches', async () => {
    const res = await POST(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect(mockRetrieve).not.toHaveBeenCalled()
  })

  it('accepts the correct Bearer token', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([])
    const res = await POST(makeRequest('Bearer test-cron-secret'))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/cron/reconcile-payments — reconciliation', () => {
  it('flips succeeded PI to CAPTURED and writes idempotency row', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking()])
    mockRetrieve.mockResolvedValueOnce(pi('succeeded'))
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({})
    mockPrisma.booking.update.mockResolvedValue({})

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.summary.captured).toBe(1)
    expect(mockPrisma.processedWebhookEvent.create).toHaveBeenCalledWith({
      data: {
        eventId: expect.stringMatching(/^reconcile:booking-1:pi_test_123:captured$/),
        source: 'stripe-reconcile',
      },
    })
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { paymentStatus: 'CAPTURED' },
    })
  })

  it('flips requires_capture PI to AUTHORISED with NEWCOMER 24h deadline', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking()])
    mockRetrieve.mockResolvedValueOnce(pi('requires_capture'))
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({})
    mockPrisma.booking.update.mockResolvedValue({})

    const before = Date.now()
    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const after = Date.now()

    expect(res.status).toBe(200)
    const updateCall = mockPrisma.booking.update.mock.calls[0][0]
    expect(updateCall.data.paymentStatus).toBe('AUTHORISED')
    // Deadline should be 24h in the future
    const deadline = updateCall.data.acceptDeadline.getTime()
    expect(deadline).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000)
    expect(deadline).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000)
  })

  // Premium tier system removed (feat/remove-premium-tiers) — tier-aware
  // acceptDeadline branching no longer exists; all artists get the flat 24h
  // window already covered by the test above.

  it('flips canceled PI to AUTH_RELEASED and cancels PENDING booking', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking()])
    mockRetrieve.mockResolvedValueOnce(pi('canceled'))
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({})
    mockPrisma.booking.update.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.summary.auth_released).toBe(1)
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'CANCELLED', paymentStatus: 'AUTH_RELEASED' },
    })
    expect(mockPrisma.notification.create).toHaveBeenCalled()
  })

  it('releases voucher hold on canceled booking', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking({
      giftVoucherCode: 'GIFT-123',
    })])
    mockRetrieve.mockResolvedValueOnce(pi('canceled'))
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({})
    mockPrisma.booking.update.mockResolvedValue({})
    mockPrisma.giftVoucher.findUnique.mockResolvedValue({
      code: 'GIFT-123',
      heldByUserId: 'customer-1',
      heldAt: new Date(),
      usedAmount: 0,
      amount: 50,
    })
    mockPrisma.giftVoucher.update.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    await POST(makeRequest('Bearer test-cron-secret'))

    expect(mockPrisma.giftVoucher.update).toHaveBeenCalledWith({
      where: { code: 'GIFT-123' },
      data: { heldByUserId: null, heldAt: null },
    })
  })

  it('leaves voucher alone if another user holds it', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking({
      giftVoucherCode: 'GIFT-123',
    })])
    mockRetrieve.mockResolvedValueOnce(pi('canceled'))
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({})
    mockPrisma.booking.update.mockResolvedValue({})
    mockPrisma.giftVoucher.findUnique.mockResolvedValue({
      code: 'GIFT-123',
      heldByUserId: 'other-customer',
      heldAt: new Date(),
    })
    mockPrisma.notification.create.mockResolvedValue({})

    await POST(makeRequest('Bearer test-cron-secret'))

    expect(mockPrisma.giftVoucher.update).not.toHaveBeenCalled()
  })

  it('marks booking FAILED when PI stuck in requires_payment_method > 60min', async () => {
    const old = new Date(Date.now() - 120 * 60 * 1000) // 2h old
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking({ createdAt: old })])
    mockRetrieve.mockResolvedValueOnce(pi('requires_payment_method'))
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({})
    mockPrisma.booking.update.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.summary.failed).toBe(1)
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
    })
  })

  it('leaves booking alone when PI is requires_action and under 60min', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking()])
    mockRetrieve.mockResolvedValueOnce(pi('requires_action'))

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.summary.still_processing).toBe(1)
    expect(mockPrisma.booking.update).not.toHaveBeenCalled()
  })

  it('logs stuck_alert for processing PI over 60min without mutating', async () => {
    const old = new Date(Date.now() - 90 * 60 * 1000)
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking({ createdAt: old })])
    mockRetrieve.mockResolvedValueOnce(pi('processing'))
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.summary.stuck_alert).toBe(1)
    expect(mockPrisma.booking.update).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('treats duplicate idempotency key (P2002) as already_reconciled', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking()])
    mockRetrieve.mockResolvedValueOnce(pi('succeeded'))
    // Simulate transaction throwing the unique-constraint error
    mockPrisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
    )

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.summary.already_reconciled).toBe(1)
  })

  it('repairs $0 bookings that have no stripePaymentId', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([booking({
      stripePaymentId: null,
      totalPrice: 0,
    })])
    mockPrisma.booking.update.mockResolvedValue({})

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.summary.no_payment_intent).toBe(1)
    expect(mockRetrieve).not.toHaveBeenCalled()
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { paymentStatus: 'NONE' },
    })
  })

  it('continues processing when one booking throws', async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([
      booking({ id: 'booking-1' }),
      booking({ id: 'booking-2', stripePaymentId: 'pi_test_456' }),
    ])
    // First retrieve throws, second succeeds
    mockRetrieve.mockRejectedValueOnce(new Error('Stripe API error'))
    mockRetrieve.mockResolvedValueOnce(pi('succeeded', 'pi_test_456'))
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({})
    mockPrisma.booking.update.mockResolvedValue({})
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest('Bearer test-cron-secret'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.scanned).toBe(2)
    expect(json.summary.stripe_error).toBe(1)
    expect(json.summary.captured).toBe(1)
    errSpy.mockRestore()
  })

  it('only picks up bookings older than 15 minutes', async () => {
    // Verify the query filters on createdAt <= now - 15min
    mockPrisma.booking.findMany.mockResolvedValueOnce([])
    await POST(makeRequest('Bearer test-cron-secret'))
    const findManyArgs = mockPrisma.booking.findMany.mock.calls[0][0]
    expect(findManyArgs.where.paymentStatus).toBe('AUTH_PENDING')
    expect(findManyArgs.where.createdAt.lte).toBeInstanceOf(Date)
    const threshold = findManyArgs.where.createdAt.lte.getTime()
    const expected = Date.now() - 15 * 60 * 1000
    // Allow 1s wiggle for test execution time
    expect(Math.abs(threshold - expected)).toBeLessThan(1000)
  })
})
