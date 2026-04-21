/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NO_SHOW transition rules (item #15).
 *
 * The booking state machine currently does NOT include NO_SHOW as a valid
 * destination from any state. NO_SHOW is referenced in analytics (fraud-signals,
 * tier update cron, UI labels) but cannot be entered via PATCH /api/bookings/[id].
 *
 * This suite locks in that reality:
 *   1. Any attempt to PATCH status=NO_SHOW is rejected as an invalid transition
 *      (from PENDING or CONFIRMED).
 *   2. Customer role cannot set NO_SHOW (not in CUSTOMER_STATUSES).
 *   3. Provider role cannot set NO_SHOW (not in PROVIDER_STATUSES).
 *   4. Admin is not exempt from the VALID_TRANSITIONS check — even admin gets
 *      400 because NO_SHOW isn't in any entry's transition set.
 *
 * If NO_SHOW handling is later added, the first expectation will flip and
 * these tests will have to be updated — making them a tripwire for a silent
 * scope change.
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: { capture: jest.fn(), cancel: jest.fn(), retrieve: jest.fn() },
    refunds: { create: jest.fn() },
  },
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bookingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    notification: { create: jest.fn().mockResolvedValue({}) },
    payout: { create: jest.fn().mockResolvedValue({}) },
    giftVoucher: { updateMany: jest.fn().mockResolvedValue({}) },
  },
}))

import { PATCH as bookingPATCH } from '@/app/api/bookings/[id]/route'
import { prisma } from '@/lib/prisma'
import { makeSession, mockSession } from '@/__tests__/helpers/sessionMock'

const mp = prisma as any

function patchReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/bookings/b1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('NO_SHOW is not a valid destination from PENDING', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provider attempt PENDING → NO_SHOW returns 403 (not in PROVIDER_STATUSES)', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce({
      id: 'b1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: 'PENDING',
      stripePaymentId: null,
    })

    const res = await bookingPATCH(patchReq({ status: 'NO_SHOW' }), { params: { id: 'b1' } })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/invalid status for provider/i)
    // Importantly: prisma.booking.update MUST NOT have been called
    expect(mp.booking.update).not.toHaveBeenCalled()
  })

  it('customer attempt → 403 (only CANCELLED_BY_CUSTOMER allowed)', async () => {
    mockSession(makeSession({ id: 'cust-1', role: 'CUSTOMER' }))
    mp.booking.findUnique.mockResolvedValueOnce({
      id: 'b1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: 'PENDING',
      stripePaymentId: null,
    })

    const res = await bookingPATCH(patchReq({ status: 'NO_SHOW' }), { params: { id: 'b1' } })
    expect(res.status).toBe(403)
    expect(mp.booking.update).not.toHaveBeenCalled()
  })

  it('admin attempt → 400 (not in VALID_TRANSITIONS for PENDING)', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.booking.findUnique.mockResolvedValueOnce({
      id: 'b1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: 'PENDING',
      stripePaymentId: null,
    })

    const res = await bookingPATCH(patchReq({ status: 'NO_SHOW' }), { params: { id: 'b1' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/cannot transition from PENDING to NO_SHOW/i)
    expect(mp.booking.update).not.toHaveBeenCalled()
  })
})

describe('NO_SHOW is not a valid destination from CONFIRMED', () => {
  beforeEach(() => jest.clearAllMocks())

  it('provider attempt CONFIRMED → NO_SHOW returns 403', async () => {
    mockSession(makeSession({ id: 'prov-1', role: 'PROVIDER' }))
    mp.booking.findUnique.mockResolvedValueOnce({
      id: 'b1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: 'CONFIRMED',
      stripePaymentId: 'pi_test',
    })

    const res = await bookingPATCH(patchReq({ status: 'NO_SHOW' }), { params: { id: 'b1' } })
    expect(res.status).toBe(403)
  })

  it('admin CONFIRMED → NO_SHOW → 400 (not in VALID_TRANSITIONS)', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.booking.findUnique.mockResolvedValueOnce({
      id: 'b1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: 'CONFIRMED',
      stripePaymentId: 'pi_test',
    })

    const res = await bookingPATCH(patchReq({ status: 'NO_SHOW' }), { params: { id: 'b1' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/cannot transition from CONFIRMED to NO_SHOW/i)
  })
})

describe('NO_SHOW is not a valid destination from terminal states', () => {
  beforeEach(() => jest.clearAllMocks())

  const terminalStates = [
    'CANCELLED',
    'CANCELLED_BY_CUSTOMER',
    'CANCELLED_BY_PROVIDER',
    'DECLINED',
    'EXPIRED',
    'REFUNDED',
  ]

  terminalStates.forEach(startState => {
    it(`admin ${startState} → NO_SHOW returns 400`, async () => {
      mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
      mp.booking.findUnique.mockResolvedValueOnce({
        id: 'b1',
        providerId: 'prov-1',
        customerId: 'cust-1',
        status: startState,
        stripePaymentId: null,
      })

      const res = await bookingPATCH(patchReq({ status: 'NO_SHOW' }), { params: { id: 'b1' } })
      expect(res.status).toBe(400)
      expect(mp.booking.update).not.toHaveBeenCalled()
    })
  })
})

describe('NO_SHOW is not a valid SOURCE state either', () => {
  beforeEach(() => jest.clearAllMocks())

  it('admin NO_SHOW → COMPLETED returns 400 (NO_SHOW not in transitions map)', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.booking.findUnique.mockResolvedValueOnce({
      id: 'b1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: 'NO_SHOW',
      stripePaymentId: null,
    })

    const res = await bookingPATCH(patchReq({ status: 'COMPLETED' }), { params: { id: 'b1' } })
    expect(res.status).toBe(400)
  })

  it('admin NO_SHOW → REFUNDED returns 400', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.booking.findUnique.mockResolvedValueOnce({
      id: 'b1',
      providerId: 'prov-1',
      customerId: 'cust-1',
      status: 'NO_SHOW',
      stripePaymentId: null,
    })

    const res = await bookingPATCH(patchReq({ status: 'REFUNDED' }), { params: { id: 'b1' } })
    expect(res.status).toBe(400)
  })
})
