/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AUDIT-014 — Tests for the admin chargeback API (list + detail + submit).
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({ authOptions: {} }))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    disputes: {
      list: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    charges: {
      retrieve: jest.fn(),
    },
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    dispute: {
      updateMany: jest.fn(),
    },
  },
}))

import { GET as listGET } from '@/app/api/admin/chargebacks/route'
import { GET as detailGET, POST as detailPOST } from '@/app/api/admin/chargebacks/[id]/route'
import { getServerSession } from 'next-auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

const mockSession = getServerSession as jest.Mock
const mockStripe = stripe as any
const mockPrisma = prisma as any

beforeEach(() => {
  jest.clearAllMocks()
})

function adminSession() {
  return { user: { id: 'admin-1', email: 'admin@sparq.com.au', role: 'ADMIN' } }
}

function makeReq(url: string, opts: any = {}): NextRequest {
  return new NextRequest(url, opts)
}

// ─── Auth ───────────────────────────────────────────────────────────────────

describe('admin chargebacks — auth', () => {
  it('list returns 401 when no session', async () => {
    mockSession.mockResolvedValueOnce(null)
    const res = await listGET(makeReq('http://localhost/api/admin/chargebacks'))
    expect(res.status).toBe(401)
  })

  it('list returns 401 when user is not an admin', async () => {
    mockSession.mockResolvedValueOnce({ user: { role: 'CUSTOMER' } })
    const res = await listGET(makeReq('http://localhost/api/admin/chargebacks'))
    expect(res.status).toBe(401)
  })

  it('detail GET returns 401 when no session', async () => {
    mockSession.mockResolvedValueOnce(null)
    const res = await detailGET(
      makeReq('http://localhost/api/admin/chargebacks/dp_1'),
      { params: { id: 'dp_1' } },
    )
    expect(res.status).toBe(401)
  })

  it('detail POST returns 401 when non-admin', async () => {
    mockSession.mockResolvedValueOnce({ user: { role: 'PROVIDER' } })
    const res = await detailPOST(
      new NextRequest('http://localhost/api/admin/chargebacks/dp_1', {
        method: 'POST',
        body: JSON.stringify({ evidence: {} }),
      }),
      { params: { id: 'dp_1' } },
    )
    expect(res.status).toBe(401)
  })
})

// ─── List endpoint ──────────────────────────────────────────────────────────

describe('admin chargebacks — list', () => {
  it('filters to open-only statuses by default', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.list.mockResolvedValueOnce({
      data: [
        makeDispute('dp_1', 'needs_response'),
        makeDispute('dp_2', 'warning_needs_response'),
        makeDispute('dp_3', 'won'), // not open
        makeDispute('dp_4', 'lost'), // not open
      ],
    })
    mockStripe.charges.retrieve.mockImplementation((id: string) => Promise.resolve({
      id,
      payment_intent: `pi_${id}`,
    }))
    mockPrisma.booking.findMany.mockResolvedValueOnce([])

    const res = await listGET(makeReq('http://localhost/api/admin/chargebacks'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.chargebacks.map((c: any) => c.id)).toEqual(['dp_1', 'dp_2'])
  })

  it('returns all disputes when scope=all', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.list.mockResolvedValueOnce({
      data: [
        makeDispute('dp_1', 'needs_response'),
        makeDispute('dp_2', 'won'),
        makeDispute('dp_3', 'lost'),
      ],
    })
    mockStripe.charges.retrieve.mockImplementation((id: string) => Promise.resolve({
      id, payment_intent: `pi_${id}`,
    }))
    mockPrisma.booking.findMany.mockResolvedValueOnce([])

    const res = await listGET(makeReq('http://localhost/api/admin/chargebacks?scope=all'))
    const json = await res.json()
    expect(json.chargebacks.length).toBe(3)
  })

  it('joins disputes to bookings by PaymentIntent ID', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.list.mockResolvedValueOnce({
      data: [makeDispute('dp_1', 'needs_response', 'ch_1')],
    })
    mockStripe.charges.retrieve.mockResolvedValueOnce({
      id: 'ch_1',
      payment_intent: 'pi_1',
    })
    mockPrisma.booking.findMany.mockResolvedValueOnce([{
      id: 'booking-1',
      stripePaymentId: 'pi_1',
      date: new Date('2026-05-01'),
      time: '10:00',
      totalPrice: 100,
      status: 'DISPUTED',
      customer: { id: 'c1', name: 'Alice', email: 'a@x.com' },
      provider: { id: 'p1', name: 'Bob', email: 'b@x.com' },
      service: { title: 'Massage', description: 'Relaxing' },
    }])

    const res = await listGET(makeReq('http://localhost/api/admin/chargebacks'))
    const json = await res.json()
    expect(json.chargebacks[0].booking.id).toBe('booking-1')
    expect(json.chargebacks[0].booking.customer.name).toBe('Alice')
  })

  it('returns 500 when Stripe API throws', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.list.mockRejectedValueOnce(new Error('Stripe down'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await listGET(makeReq('http://localhost/api/admin/chargebacks'))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toMatch(/Stripe down/)
    errSpy.mockRestore()
  })
})

// ─── Detail GET ─────────────────────────────────────────────────────────────

describe('admin chargebacks — detail GET', () => {
  it('returns dispute + booking + suggested evidence', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.retrieve.mockResolvedValueOnce({
      ...makeDispute('dp_1', 'needs_response', 'ch_1'),
      evidence: {},
    })
    mockStripe.charges.retrieve.mockResolvedValueOnce({
      id: 'ch_1',
      payment_intent: 'pi_1',
    })
    mockPrisma.booking.findFirst.mockResolvedValueOnce({
      id: 'booking-1',
      stripePaymentId: 'pi_1',
      date: new Date('2026-05-01T00:00:00Z'),
      time: '10:00',
      customer: { id: 'c1', name: 'Alice', email: 'alice@x.com' },
      provider: { id: 'p1', name: 'Bob', email: 'bob@x.com' },
      service: { title: 'Massage', description: 'Relaxing 60-minute massage' },
      messages: [
        { id: 'm1', senderId: 'c1', text: 'Hi!', createdAt: new Date('2026-04-28T10:00:00Z') },
      ],
    })

    const res = await detailGET(
      makeReq('http://localhost/api/admin/chargebacks/dp_1'),
      { params: { id: 'dp_1' } },
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggested.product_description).toMatch(/Relaxing/)
    expect(json.suggested.service_date).toBe('2026-05-01')
    expect(json.suggested.customer_email_address).toBe('alice@x.com')
    expect(json.suggested.customer_name).toBe('Alice')
    expect(json.suggested.customer_communication).toMatch(/Hi!/)
    expect(json.suggested.cancellation_policy_disclosure).toBeTruthy()
  })

  it('returns empty suggestions when no booking found', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.retrieve.mockResolvedValueOnce({
      ...makeDispute('dp_1', 'needs_response', 'ch_1'),
      evidence: {},
    })
    mockStripe.charges.retrieve.mockResolvedValueOnce({
      id: 'ch_1',
      payment_intent: 'pi_1',
    })
    mockPrisma.booking.findFirst.mockResolvedValueOnce(null)

    const res = await detailGET(
      makeReq('http://localhost/api/admin/chargebacks/dp_1'),
      { params: { id: 'dp_1' } },
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.booking).toBeNull()
    expect(Object.keys(json.suggested)).toEqual([])
  })
})

// ─── Detail POST (evidence submit) ──────────────────────────────────────────

describe('admin chargebacks — detail POST (submit evidence)', () => {
  it('filters payload to allowlisted fields only', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.update.mockResolvedValueOnce({
      id: 'dp_1',
      charge: 'ch_1',
      status: 'needs_response',
      evidence_details: { has_evidence: true, submission_count: 0 },
    })
    mockStripe.charges.retrieve.mockResolvedValueOnce({
      id: 'ch_1', payment_intent: 'pi_1',
    })
    mockPrisma.booking.findFirst.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/admin/chargebacks/dp_1', {
      method: 'POST',
      body: JSON.stringify({
        evidence: {
          product_description: 'hello',
          service_date: '2026-05-01',
          malicious_field: 'rm -rf /',
          service_documentation: 'file_xxx', // file field — not in allowlist
        },
      }),
    })
    const res = await detailPOST(req, { params: { id: 'dp_1' } })
    expect(res.status).toBe(200)

    const updateCall = mockStripe.disputes.update.mock.calls[0]
    expect(updateCall[0]).toBe('dp_1')
    expect(updateCall[1].evidence).toEqual({
      product_description: 'hello',
      service_date: '2026-05-01',
    })
    expect(updateCall[1].evidence).not.toHaveProperty('malicious_field')
    expect(updateCall[1].evidence).not.toHaveProperty('service_documentation')
  })

  it('does NOT pass submit=true on draft save', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.update.mockResolvedValueOnce({
      id: 'dp_1', charge: 'ch_1', status: 'needs_response',
      evidence_details: { has_evidence: true, submission_count: 0 },
    })
    mockStripe.charges.retrieve.mockResolvedValueOnce({ id: 'ch_1', payment_intent: 'pi_1' })
    mockPrisma.booking.findFirst.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/admin/chargebacks/dp_1', {
      method: 'POST',
      body: JSON.stringify({ evidence: { product_description: 'x' } }),
    })
    await detailPOST(req, { params: { id: 'dp_1' } })

    const updateCall = mockStripe.disputes.update.mock.calls[0]
    expect(updateCall[1].submit).toBeUndefined()
  })

  it('passes submit=true when explicitly requested', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.update.mockResolvedValueOnce({
      id: 'dp_1', charge: 'ch_1', status: 'under_review',
      evidence_details: { has_evidence: true, submission_count: 1 },
    })
    mockStripe.charges.retrieve.mockResolvedValueOnce({ id: 'ch_1', payment_intent: 'pi_1' })
    mockPrisma.booking.findFirst.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/admin/chargebacks/dp_1', {
      method: 'POST',
      body: JSON.stringify({ evidence: { product_description: 'x' }, submit: true }),
    })
    const res = await detailPOST(req, { params: { id: 'dp_1' } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.submitted).toBe(true)
    expect(mockStripe.disputes.update.mock.calls[0][1].submit).toBe(true)
  })

  it('writes an internal audit trail to Dispute model when booking exists', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.update.mockResolvedValueOnce({
      id: 'dp_1', charge: 'ch_1', status: 'under_review',
      evidence_details: { has_evidence: true, submission_count: 1 },
    })
    mockStripe.charges.retrieve.mockResolvedValueOnce({ id: 'ch_1', payment_intent: 'pi_1' })
    mockPrisma.booking.findFirst.mockResolvedValueOnce({ id: 'booking-1' })
    mockPrisma.dispute.updateMany.mockResolvedValueOnce({ count: 1 })

    const req = new NextRequest('http://localhost/api/admin/chargebacks/dp_1', {
      method: 'POST',
      body: JSON.stringify({
        evidence: {
          product_description: 'Legit service',
          refund_refusal_explanation: 'Customer completed the session',
        },
        submit: true,
      }),
    })
    await detailPOST(req, { params: { id: 'dp_1' } })

    expect(mockPrisma.dispute.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'booking-1' },
      data: {
        evidence: expect.stringContaining('product_description'),
        status: 'UNDER_REVIEW',
      },
    })
  })

  it('returns 400 on invalid JSON body', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    const req = new NextRequest('http://localhost/api/admin/chargebacks/dp_1', {
      method: 'POST',
      body: 'not json',
    })
    const res = await detailPOST(req, { params: { id: 'dp_1' } })
    expect(res.status).toBe(400)
  })

  it('does not crash when Stripe returns an error', async () => {
    mockSession.mockResolvedValueOnce(adminSession())
    mockStripe.disputes.update.mockRejectedValueOnce(new Error('Dispute is closed'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const req = new NextRequest('http://localhost/api/admin/chargebacks/dp_1', {
      method: 'POST',
      body: JSON.stringify({ evidence: { product_description: 'x' } }),
    })
    const res = await detailPOST(req, { params: { id: 'dp_1' } })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toMatch(/Dispute is closed/)
    errSpy.mockRestore()
  })
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDispute(id: string, status: string, chargeId: string = 'ch_xxx'): any {
  return {
    id,
    charge: chargeId,
    amount: 5000, // cents
    currency: 'aud',
    reason: 'fraudulent',
    status,
    created: Math.floor(Date.now() / 1000),
    evidence_details: {
      due_by: Math.floor(Date.now() / 1000) + 5 * 24 * 60 * 60,
      has_evidence: false,
      submission_count: 0,
    },
    evidence: {},
  }
}
