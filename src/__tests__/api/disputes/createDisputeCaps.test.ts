/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dispute-creation caps (item #6).
 *
 * POST /api/disputes enforces five "caps" that together keep the dispute
 * surface from being abused:
 *
 *   1. auth       — must be logged in
 *   2. ownership  — only the booking's customer can open a dispute
 *   3. lifecycle  — booking.status MUST be COMPLETED
 *                   (you can't dispute a cancellation; you can't dispute in-flight)
 *   4. one-per    — only one dispute per booking (this IS the per-booking cap;
 *                   it's what prevents a customer spamming the admin queue with
 *                   repeated disputes on the same job)
 *   5. deadline   — booking.disputeDeadline defaults to 48hr post-completion
 *                   (BL-6 / platform.dispute_window_hours)
 *
 * Side effects on success (also verified here):
 *   - booking.status = DISPUTED
 *   - any SCHEDULED payout for this booking → CANCELLED
 *   - bookingStatusHistory row recorded
 *   - provider notified (BOOKING_DISPUTED)
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    dispute: {
      create: jest.fn(),
    },
    payout: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    bookingStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

import { POST as createDispute } from '@/app/api/disputes/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

const mp = prisma as any
const mockGetSession = getServerSession as jest.MockedFunction<typeof getServerSession>

function disputeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/disputes', {
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
    status: 'COMPLETED',
    disputeDeadline: new Date(Date.now() + 24 * 3600_000), // inside window
    totalPrice: 120,
    dispute: null,
    ...overrides,
  }
}

describe('POST /api/disputes — creation caps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'cust_1', role: 'CUSTOMER', email: 'c@example.com' },
    } as any)
    mp.dispute.create.mockResolvedValue({ id: 'disp_1', bookingId: 'book_1' })
  })

  // ─── 1) auth ─────────────────────────────────────────────────────────────
  it('401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await createDispute(
      disputeReq({ bookingId: 'book_1', reason: 'x' }),
    )
    expect(res.status).toBe(401)
    expect(mp.dispute.create).not.toHaveBeenCalled()
  })

  // ─── validation ─────────────────────────────────────────────────────────
  it('400 when bookingId is missing', async () => {
    const res = await createDispute(disputeReq({ reason: 'bad job' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/bookingId|reason/i)
  })

  it('400 when reason is missing or whitespace-only', async () => {
    const res1 = await createDispute(disputeReq({ bookingId: 'book_1' }))
    expect(res1.status).toBe(400)
    const res2 = await createDispute(
      disputeReq({ bookingId: 'book_1', reason: '   ' }),
    )
    expect(res2.status).toBe(400)
  })

  it('404 when booking does not exist', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(null)
    const res = await createDispute(
      disputeReq({ bookingId: 'missing', reason: 'x' }),
    )
    expect(res.status).toBe(404)
    expect(mp.dispute.create).not.toHaveBeenCalled()
  })

  // ─── 2) ownership ───────────────────────────────────────────────────────
  it('403 when the caller is not the booking customer (e.g. provider or third party)', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(
      bookingFixture({ customerId: 'OTHER' }),
    )
    const res = await createDispute(
      disputeReq({ bookingId: 'book_1', reason: 'x' }),
    )
    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/only the customer/i)
    expect(mp.dispute.create).not.toHaveBeenCalled()
  })

  // ─── 3) lifecycle ───────────────────────────────────────────────────────
  it.each([
    ['PENDING'],
    ['CONFIRMED'],
    ['CANCELLED_BY_CUSTOMER'],
    ['CANCELLED_BY_PROVIDER'],
    ['DECLINED'],
    ['REFUNDED'],
    ['DISPUTED'],
  ])(
    '400 when booking.status=%s — only COMPLETED is disputable',
    async (status) => {
      mp.booking.findUnique.mockResolvedValueOnce(
        bookingFixture({ status }),
      )
      const res = await createDispute(
        disputeReq({ bookingId: 'book_1', reason: 'x' }),
      )
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/only dispute completed/i)
      expect(mp.dispute.create).not.toHaveBeenCalled()
    },
  )

  // ─── 4) one-per-booking cap ─────────────────────────────────────────────
  it('400 when a dispute already exists for this booking (the per-booking cap)', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(
      bookingFixture({ dispute: { id: 'disp_existing', status: 'OPEN' } }),
    )
    const res = await createDispute(
      disputeReq({ bookingId: 'book_1', reason: 'same again' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/already exists/i)
    // Must not even attempt to create — no admin-queue spam
    expect(mp.dispute.create).not.toHaveBeenCalled()
    // And must NOT demote the booking a second time
    expect(mp.booking.update).not.toHaveBeenCalled()
  })

  // ─── 5) dispute window ─────────────────────────────────────────────────
  it('400 when past disputeDeadline (BL-6 / 48-hour window)', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(
      bookingFixture({
        disputeDeadline: new Date(Date.now() - 3600_000), // 1h past
      }),
    )
    const res = await createDispute(
      disputeReq({ bookingId: 'book_1', reason: 'late report' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/window has expired/i)
    expect(mp.dispute.create).not.toHaveBeenCalled()
  })

  it('allows dispute when disputeDeadline is null (defaults to open)', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(
      bookingFixture({ disputeDeadline: null }),
    )
    const res = await createDispute(
      disputeReq({ bookingId: 'book_1', reason: 'no deadline set' }),
    )
    expect(res.status).toBe(200)
    expect(mp.dispute.create).toHaveBeenCalled()
  })

  // ─── Happy path side effects ────────────────────────────────────────────
  it('happy path: creates dispute, demotes booking to DISPUTED, cancels scheduled payout, notifies provider', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture())
    const res = await createDispute(
      disputeReq({
        bookingId: 'book_1',
        reason: '  Artist arrived 2 hours late and rushed the service  ',
        evidence: ' photos attached ',
      }),
    )
    expect(res.status).toBe(200)

    // Reason is trimmed before storage
    expect(mp.dispute.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'book_1',
        customerId: 'cust_1',
        reason: 'Artist arrived 2 hours late and rushed the service',
        evidence: 'photos attached',
      }),
    })

    // Booking demoted
    expect(mp.booking.update).toHaveBeenCalledWith({
      where: { id: 'book_1' },
      data: { status: 'DISPUTED' },
    })

    // BL-6: SCHEDULED payout cancelled so money doesn't flee mid-dispute
    expect(mp.payout.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'book_1', status: 'SCHEDULED' },
      data: { status: 'CANCELLED' },
    })

    // Provider notified
    expect(mp.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'prov_1',
        type: 'BOOKING_DISPUTED',
      }),
    })

    // Status history recorded for audit
    expect(mp.bookingStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'book_1',
        fromStatus: 'COMPLETED',
        toStatus: 'DISPUTED',
        changedBy: 'cust_1',
      }),
    })
  })

  it('null evidence is accepted (optional field)', async () => {
    mp.booking.findUnique.mockResolvedValueOnce(bookingFixture())
    const res = await createDispute(
      disputeReq({ bookingId: 'book_1', reason: 'bad' }),
    )
    expect(res.status).toBe(200)
    expect(mp.dispute.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ evidence: null }),
    })
  })
})
