/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin dispute resolution — refund + withdraw path (item #7).
 *
 * PATCH /api/admin/disputes resolves a dispute into one of:
 *   RESOLVED_REFUND    → full/partial refund to customer; cancel or reverse payout
 *   RESOLVED_NO_REFUND → re-schedule the payout to the provider
 *   CLOSED             → withdraw / close without payment action
 *
 * Covered here, in priority order:
 *
 *   A. Refund amount bounds: 0.01 ≤ refundAmount ≤ totalPrice  (NEW-11)
 *   B. Cumulative refund cap: refundAmount ≤ totalPrice − alreadyRefunded  (P0-6/UX-10)
 *   C. Double-refund race guard: the inside-transaction re-read throws
 *      DOUBLE_REFUND → 409 from the outer catch  (P0-5)
 *   D. Stripe failure rollback: refund throw reverts booking & dispute → 502
 *   E. Completed-payout path: issues transfer reversal + customer refund
 *   F. Scheduled-payout path: cancels payout + issues customer refund
 *   G. RESOLVED_NO_REFUND with CANCELLED payout → reschedules payout
 *   H. RESOLVED_NO_REFUND with COMPLETED payout → logs audit warning, no mutation
 *   I. CLOSED withdraw path: closes dispute, resets booking, no Stripe calls
 *   J. Auth: non-admin gets 401
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: { create: jest.fn() },
    transfers: { createReversal: jest.fn() },
    paymentIntents: { retrieve: jest.fn() },
  },
}))

jest.mock('@/lib/prisma', () => {
  const prismaStub: any = {
    dispute: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    booking: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    payout: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    bookingStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
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

import { PATCH as resolveDispute } from '@/app/api/admin/disputes/route'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getServerSession } from 'next-auth'

const mp = prisma as any
const ms = stripe as any
const mockGetSession = getServerSession as jest.MockedFunction<typeof getServerSession>

function patchReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/disputes', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function disputeFixture(overrides: any = {}) {
  const { booking: bookingOverride, ...rest } = overrides
  return {
    id: 'disp_1',
    bookingId: 'book_1',
    status: 'OPEN',
    ...rest,
    booking: {
      customerId: 'cust_1',
      providerId: 'prov_1',
      stripePaymentId: 'pi_1',
      totalPrice: 200,
      status: 'DISPUTED',
      refundStatus: 'NONE',
      refundAmount: null,
      ...(bookingOverride ?? {}),
    },
  }
}

describe('PATCH /api/admin/disputes — auth', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 when not logged in', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(401)
  })

  it('401 when logged in as non-admin', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'x', role: 'CUSTOMER' },
    } as any)
    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/admin/disputes — refund amount caps (NEW-11, P0-6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'admin_1', role: 'ADMIN' },
    } as any)
  })

  it('rejects refundAmount <= 0 with a helpful message', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND', refundAmount: 0 }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/between \$0\.01/)
    expect(ms.refunds.create).not.toHaveBeenCalled()
  })

  it('rejects refundAmount greater than totalPrice', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(
      disputeFixture({ booking: { totalPrice: 200 } }),
    )
    const res = await resolveDispute(
      patchReq({
        disputeId: 'disp_1',
        status: 'RESOLVED_REFUND',
        refundAmount: 500,
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/\$200\.00/)
    expect(ms.refunds.create).not.toHaveBeenCalled()
  })

  it('rejects refundAmount exceeding remaining refundable after partial refund (cumulative cap)', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(
      disputeFixture({
        booking: {
          totalPrice: 200,
          refundStatus: 'PROCESSED',
          refundAmount: 80, // already refunded $80
        },
      }),
    )
    const res = await resolveDispute(
      patchReq({
        disputeId: 'disp_1',
        status: 'RESOLVED_REFUND',
        refundAmount: 150, // would push total to $230 > $200
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Already refunded: \$80\.00/)
    expect(body.error).toMatch(/Maximum additional refund: \$120\.00/)
  })
})

describe('PATCH /api/admin/disputes — double-refund race guard (P0-5)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'admin_1', role: 'ADMIN' },
    } as any)
  })

  it('409 when the in-transaction re-read finds the booking is already PROCESSED', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    // Outer refundStatus check sees NONE — passes
    // Inside the $transaction, re-read reports PROCESSED (another request won the race)
    mp.booking.findUnique.mockResolvedValueOnce({ refundStatus: 'PROCESSED' })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/duplicate refund blocked/i)
    // Critical: no Stripe call was made after the guard fired
    expect(ms.refunds.create).not.toHaveBeenCalled()
    expect(ms.transfers.createReversal).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/admin/disputes — RESOLVED_REFUND happy paths', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'admin_1', role: 'ADMIN' },
    } as any)
  })

  it('no prior payout: refunds the customer via Stripe with idempotency key', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.booking.findUnique.mockResolvedValueOnce({ refundStatus: 'NONE' })
    mp.payout.findFirst.mockResolvedValueOnce(null)
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })
    ms.refunds.create.mockResolvedValueOnce({ id: 're_1' })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(200)

    expect(ms.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: 'pi_1',
        amount: 20000, // $200.00 → cents
        reason: 'fraudulent',
      }),
      { idempotencyKey: 'dispute_disp_1_refund' },
    )
    // Reversal is NOT attempted when there's no completed payout
    expect(ms.transfers.createReversal).not.toHaveBeenCalled()
  })

  it('completed payout: creates transfer reversal AND customer refund; marks payout CANCELLED', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.booking.findUnique.mockResolvedValueOnce({ refundStatus: 'NONE' })
    mp.payout.findFirst.mockResolvedValueOnce({
      id: 'pay_1',
      status: 'COMPLETED',
      stripeTransferId: 'tr_live',
    })
    ms.transfers.createReversal.mockResolvedValueOnce({ id: 'trr_1' })
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })
    ms.refunds.create.mockResolvedValueOnce({ id: 're_1' })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reversalStatus).toBe('success')

    expect(ms.transfers.createReversal).toHaveBeenCalledWith(
      'tr_live',
      expect.objectContaining({ amount: 20000 }),
    )
    // Payout record annotated with reversal id and CANCELLED
    expect(mp.payout.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        status: 'CANCELLED',
        stripeTransferId: 'reversed:trr_1',
      }),
    })
    expect(ms.refunds.create).toHaveBeenCalled()
  })

  it('reversal failure is logged but the customer refund still proceeds (manual reconciliation path)', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.booking.findUnique.mockResolvedValueOnce({ refundStatus: 'NONE' })
    mp.payout.findFirst.mockResolvedValueOnce({
      id: 'pay_1',
      status: 'COMPLETED',
      stripeTransferId: 'tr_fail',
    })
    ms.transfers.createReversal.mockRejectedValueOnce(
      new Error('already_reversed'),
    )
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })
    ms.refunds.create.mockResolvedValueOnce({ id: 're_1' })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reversalStatus).toBe('failed')
    expect(body.reversalError).toMatch(/already_reversed/)
    // Refund still issued
    expect(ms.refunds.create).toHaveBeenCalled()
    // Audit trail exists for ops to reconcile
    expect(mp.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'DISPUTE_REVERSAL_FAILED',
      }),
    })
  })

  it('scheduled payout: cancels it and logs a PAYOUT_CANCELLED_FOR_DISPUTE_REFUND audit entry', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.booking.findUnique.mockResolvedValueOnce({ refundStatus: 'NONE' })
    mp.payout.findFirst.mockResolvedValueOnce({
      id: 'pay_scheduled',
      status: 'SCHEDULED',
      stripeTransferId: null,
    })
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })
    ms.refunds.create.mockResolvedValueOnce({ id: 're_1' })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(200)

    expect(mp.payout.update).toHaveBeenCalledWith({
      where: { id: 'pay_scheduled' },
      data: { status: 'CANCELLED' },
    })
    expect(mp.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PAYOUT_CANCELLED_FOR_DISPUTE_REFUND',
      }),
    })
    // No reversal on a not-yet-sent payout
    expect(ms.transfers.createReversal).not.toHaveBeenCalled()
  })

  it('Stripe refund failure: rolls back dispute + booking state and returns 502', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.booking.findUnique.mockResolvedValueOnce({ refundStatus: 'NONE' })
    mp.payout.findFirst.mockResolvedValueOnce(null)
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })
    ms.refunds.create.mockRejectedValueOnce(new Error('insufficient_funds'))

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/Stripe refund failed/)

    // Rollback transaction was invoked (dispute revert + booking revert)
    expect(mp.$transaction).toHaveBeenCalled()
  })

  it('does not attempt refund when Stripe PI is not in succeeded state', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.booking.findUnique.mockResolvedValueOnce({ refundStatus: 'NONE' })
    mp.payout.findFirst.mockResolvedValueOnce(null)
    ms.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'canceled' })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_REFUND' }),
    )
    // Booking was still updated to REFUNDED (platform absorbs), but no Stripe refund call
    expect(res.status).toBe(200)
    expect(ms.refunds.create).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/admin/disputes — RESOLVED_NO_REFUND path', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'admin_1', role: 'ADMIN' },
    } as any)
  })

  it('cancelled payout → re-schedules it and logs audit', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.payout.findFirst.mockResolvedValueOnce({
      id: 'pay_1',
      status: 'CANCELLED',
    })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_NO_REFUND' }),
    )
    expect(res.status).toBe(200)

    expect(mp.payout.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        status: 'SCHEDULED',
        scheduledAt: expect.any(Date),
      }),
    })
    expect(mp.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PAYOUT_RESCHEDULED_AFTER_DISPUTE',
      }),
    })
    // Booking returns to COMPLETED
    expect(mp.booking.update).toHaveBeenCalledWith({
      where: { id: 'book_1' },
      data: { status: 'COMPLETED' },
    })
  })

  it('already-completed payout → does not mutate; logs a warning audit entry', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.payout.findFirst.mockResolvedValueOnce({
      id: 'pay_1',
      status: 'COMPLETED',
      stripeTransferId: 'tr_live',
    })

    const res = await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_NO_REFUND' }),
    )
    expect(res.status).toBe(200)

    // No update to the completed payout
    expect(mp.payout.update).not.toHaveBeenCalled()
    // But an audit warning is recorded
    expect(mp.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'DISPUTE_PAYOUT_UNMODIFIED_WARNING',
      }),
    })
  })

  it('no stripe calls on RESOLVED_NO_REFUND', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.payout.findFirst.mockResolvedValueOnce(null)

    await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_NO_REFUND' }),
    )
    expect(ms.refunds.create).not.toHaveBeenCalled()
    expect(ms.transfers.createReversal).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/admin/disputes — CLOSED (withdraw) path', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'admin_1', role: 'ADMIN' },
    } as any)
  })

  it('closes the dispute, restores booking to COMPLETED, no Stripe activity', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.payout.findFirst.mockResolvedValueOnce(null)

    const res = await resolveDispute(
      patchReq({
        disputeId: 'disp_1',
        status: 'CLOSED',
        resolution: 'Customer withdrew complaint',
      }),
    )
    expect(res.status).toBe(200)

    expect(mp.dispute.update).toHaveBeenCalledWith({
      where: { id: 'disp_1' },
      data: expect.objectContaining({
        status: 'CLOSED',
        resolution: 'Customer withdrew complaint',
        resolvedBy: 'admin_1',
      }),
    })
    expect(mp.booking.update).toHaveBeenCalledWith({
      where: { id: 'book_1' },
      data: { status: 'COMPLETED' },
    })
    expect(ms.refunds.create).not.toHaveBeenCalled()
    expect(ms.transfers.createReversal).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/admin/disputes — not-found & notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'admin_1', role: 'ADMIN' },
    } as any)
  })

  it('404 when disputeId does not exist', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(null)
    const res = await resolveDispute(
      patchReq({ disputeId: 'missing', status: 'CLOSED' }),
    )
    expect(res.status).toBe(404)
  })

  it('notifies both customer and provider on resolution', async () => {
    mp.dispute.findUnique.mockResolvedValueOnce(disputeFixture())
    mp.payout.findFirst.mockResolvedValueOnce(null)

    await resolveDispute(
      patchReq({ disputeId: 'disp_1', status: 'RESOLVED_NO_REFUND' }),
    )

    const notifyCalls = (mp.notification.create as jest.Mock).mock.calls.map(
      (c: any[]) => c[0].data.userId,
    )
    expect(notifyCalls).toEqual(
      expect.arrayContaining(['cust_1', 'prov_1']),
    )
  })
})
