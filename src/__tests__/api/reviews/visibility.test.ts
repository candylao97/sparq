/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Review visibility contract (item #14).
 *
 * Public provider-detail route MUST filter `isVisible: true` when loading
 * reviews, so a flagged/hidden review is invisible to end users. Flagging
 * endpoint transitions the bit.
 *
 * This locks two seams:
 *   (a) POST /api/reviews/[id]/flag sets isFlagged=true with a user-report reason
 *   (b) GET /api/providers/[id] passes { isVisible: true } in the review WHERE
 *       clause — the single guarantee that hidden reviews never leak
 *   (c) PATCH /api/admin/reviews/[id] can toggle isVisible and records
 *       moderatedAt/moderatedBy
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    providerProfile: {
      findUnique: jest.fn(),
    },
    availability: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    booking: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
}))
jest.mock('@/lib/content-filter', () => ({
  filterContactInfo: jest.fn().mockReturnValue({
    flagged: false,
    flagType: null,
    text: '',
    matches: [],
  }),
}))

import { POST as flagPOST } from '@/app/api/reviews/[id]/flag/route'
import { PATCH as adminReviewPATCH } from '@/app/api/admin/reviews/[id]/route'
import { GET as providerGET } from '@/app/api/providers/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { makeSession, mockSession } from '@/__tests__/helpers/sessionMock'

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mp = prisma as any

function req(url: string, method = 'POST', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('POST /api/reviews/[id]/flag — user reports hide review from public', () => {
  beforeEach(() => {
    mockedSession.mockReset()
    mp.review.findUnique.mockReset()
    mp.review.update.mockReset()
  })

  it('401 when unauthenticated', async () => {
    mockSession(null)
    const res = await flagPOST(req('http://x/api/reviews/r1/flag', 'POST', { reason: 'spam' }), { params: { id: 'r1' } })
    expect(res.status).toBe(401)
  })

  it('400 when reason is missing', async () => {
    mockSession(makeSession({ id: 'u1', role: 'CUSTOMER' }))
    const res = await flagPOST(req('http://x/api/reviews/r1/flag', 'POST', {}), { params: { id: 'r1' } })
    expect(res.status).toBe(400)
  })

  it('400 when reason is whitespace-only', async () => {
    mockSession(makeSession({ id: 'u1', role: 'CUSTOMER' }))
    const res = await flagPOST(req('http://x/api/reviews/r1/flag', 'POST', { reason: '   ' }), { params: { id: 'r1' } })
    expect(res.status).toBe(400)
  })

  it('400 when reason exceeds 500 chars', async () => {
    mockSession(makeSession({ id: 'u1', role: 'CUSTOMER' }))
    const res = await flagPOST(
      req('http://x/api/reviews/r1/flag', 'POST', { reason: 'a'.repeat(501) }),
      { params: { id: 'r1' } },
    )
    expect(res.status).toBe(400)
  })

  it('403 when user tries to flag their own review', async () => {
    mockSession(makeSession({ id: 'u1', role: 'CUSTOMER' }))
    mp.review.findUnique.mockResolvedValueOnce({ customerId: 'u1' })
    const res = await flagPOST(
      req('http://x/api/reviews/r1/flag', 'POST', { reason: 'self report' }),
      { params: { id: 'r1' } },
    )
    expect(res.status).toBe(403)
  })

  it('404 when review does not exist', async () => {
    mockSession(makeSession({ id: 'u1', role: 'CUSTOMER' }))
    mp.review.findUnique.mockResolvedValueOnce(null)
    const res = await flagPOST(
      req('http://x/api/reviews/r1/flag', 'POST', { reason: 'spam' }),
      { params: { id: 'r1' } },
    )
    expect(res.status).toBe(404)
  })

  it('sets isFlagged=true and saves a prefixed flagReason', async () => {
    mockSession(makeSession({ id: 'reporter-1', role: 'CUSTOMER' }))
    mp.review.findUnique.mockResolvedValueOnce({ customerId: 'author-2' })
    mp.review.update.mockResolvedValueOnce({})

    const res = await flagPOST(
      req('http://x/api/reviews/r1/flag', 'POST', { reason: 'This review is spam' }),
      { params: { id: 'r1' } },
    )
    expect(res.status).toBe(200)
    expect(mp.review.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: {
        isFlagged: true,
        flagReason: 'User report: This review is spam',
      },
    })
  })
})

describe('GET /api/providers/[id] — public provider page filters hidden reviews', () => {
  beforeEach(() => {
    mockedSession.mockReset()
    mp.providerProfile.findUnique.mockReset()
    mp.review.findMany.mockReset()
    mp.availability.findFirst.mockClear()
    mp.availability.findMany.mockClear()
  })

  it('passes isVisible: true to review query', async () => {
    mockSession(null) // unauthenticated public viewer
    mp.providerProfile.findUnique.mockResolvedValueOnce({
      id: 'prof-1',
      userId: 'prov-1',
      studioAddress: null,
      aiSummary: null,
      user: { id: 'prov-1', email: 'a@b.com', phone: '0', name: 'Test' },
    })
    mp.review.findMany.mockResolvedValueOnce([])
    mp.availability.findFirst.mockResolvedValueOnce(null)
    mp.availability.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/providers/prof-1')
    const res = await providerGET(request, { params: { id: 'prof-1' } })

    expect(res.status).toBeLessThan(500)
    // The critical assertion: WHERE clause includes isVisible: true
    expect(mp.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isVisible: true,
          booking: expect.objectContaining({ providerId: 'prov-1' }),
        }),
      }),
    )
  })

  it('hidden reviews are not returned in aggregate (avgRating excludes them)', async () => {
    mockSession(null)
    mp.providerProfile.findUnique.mockResolvedValueOnce({
      id: 'prof-1',
      userId: 'prov-1',
      studioAddress: null,
      aiSummary: null,
      user: { id: 'prov-1', email: 'a@b.com', phone: '0', name: 'Test' },
    })
    // Only visible reviews are returned (the DB filter already excluded hidden ones)
    mp.review.findMany.mockResolvedValueOnce([
      { id: 'r1', rating: 5, createdAt: new Date(), customer: { name: 'A' } },
      { id: 'r2', rating: 5, createdAt: new Date(), customer: { name: 'B' } },
    ])
    mp.availability.findFirst.mockResolvedValueOnce(null)
    mp.availability.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/providers/prof-1')
    const res = await providerGET(request, { params: { id: 'prof-1' } })
    const body = await res.json()

    expect(body.reviews).toHaveLength(2)
    expect(body.averageRating).toBe(5)
    expect(body.reviewCount).toBe(2)
  })
})

describe('PATCH /api/admin/reviews/[id] — admin moderates visibility', () => {
  beforeEach(() => {
    mockedSession.mockReset()
    mp.review.update.mockReset()
  })

  it('flips isVisible=false to hide a review', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.review.update.mockResolvedValueOnce({
      id: 'r1',
      isVisible: false,
      customer: { id: 'c', name: 'n', email: 'e' },
      booking: { service: { id: 's', title: 't' }, provider: { id: 'p', name: 'n' } },
    })
    const res = await adminReviewPATCH(
      req('http://x/api/admin/reviews/r1', 'PATCH', { isVisible: false }),
      { params: { id: 'r1' } },
    )
    expect(res.status).toBe(200)
    expect(mp.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({
          isVisible: false,
          moderatedAt: expect.any(Date),
          moderatedBy: 'admin-1',
        }),
      }),
    )
  })

  it('flips isFlagged independently of isVisible', async () => {
    mockSession(makeSession({ id: 'admin-1', role: 'ADMIN' }))
    mp.review.update.mockResolvedValueOnce({
      id: 'r1',
      isFlagged: true,
      customer: { id: 'c', name: 'n', email: 'e' },
      booking: { service: { id: 's', title: 't' }, provider: { id: 'p', name: 'n' } },
    })
    const res = await adminReviewPATCH(
      req('http://x/api/admin/reviews/r1', 'PATCH', { isFlagged: true, flagReason: 'off-topic' }),
      { params: { id: 'r1' } },
    )
    expect(res.status).toBe(200)
    expect(mp.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isFlagged: true,
          flagReason: 'off-topic',
        }),
      }),
    )
    // isVisible NOT set when not in body
    const call = (mp.review.update as jest.Mock).mock.calls[0][0]
    expect(call.data.isVisible).toBeUndefined()
  })
})
