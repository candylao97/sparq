/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for /api/providers (GET list) and /api/providers/[id] (GET detail)
 *
 * Strategy:
 *  - Mock @/lib/prisma so no real database is required
 *  - The providers list route is public (no auth required)
 *  - The provider detail route is also public
 */

import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
  cookies: jest.fn(() => ({ get: jest.fn(), getAll: jest.fn(() => []) })),
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    providerProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}))

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { GET as providersGET } from '@/app/api/providers/route'
import { GET as providerByIdGET } from '@/app/api/providers/[id]/route'
import { prisma } from '@/lib/prisma'

// ─── Types / Helpers ─────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>

function makeRequest(url: string): NextRequest {
  return new NextRequest(url)
}

/** Minimal provider profile fixture */
function makeProviderFixture(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-provider-1',
    suburb: 'Bondi',
    city: 'Sydney',
    tier: 'TRUSTED',
    subscriptionPlan: 'PRO',
    offerAtHome: true,
    offerAtStudio: false,
    isVerified: true,
    services: [
      { id: 'svc-1', title: 'Gel Manicure', category: 'NAILS', price: 85, isActive: true },
    ],
    portfolio: [],
    _count: { services: 1 },
    user: { id: 'user-provider-1', name: 'Sophie Chen', image: null },
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/providers', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns a list of providers with pagination metadata', async () => {
    const providers = [makeProviderFixture(), makeProviderFixture({ id: 'profile-2', userId: 'user-2' })]

    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockResolvedValueOnce(providers)
    ;(mockPrisma.providerProfile.count as jest.Mock).mockResolvedValueOnce(2)
    ;(mockPrisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
      { providerId: 'user-provider-1', avg: 4.8, count: BigInt(10) },
      { providerId: 'user-2', avg: 4.8, count: BigInt(10) },
    ])

    const req = makeRequest('http://localhost/api/providers')
    const res = await providersGET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.providers).toHaveLength(2)
    expect(json.total).toBe(2)
    expect(json.page).toBe(1)
    expect(json.pages).toBe(1)
  })

  it('enriches each provider with averageRating and reviewCount', async () => {
    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockResolvedValueOnce([makeProviderFixture()])
    ;(mockPrisma.providerProfile.count as jest.Mock).mockResolvedValueOnce(1)
    ;(mockPrisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
      { providerId: 'user-provider-1', avg: 4.5, count: BigInt(8) },
    ])

    const req = makeRequest('http://localhost/api/providers')
    const res = await providersGET(req)

    const json = await res.json()
    const provider = json.providers[0]
    expect(provider.averageRating).toBe(4.5)
    expect(provider.reviewCount).toBe(8)
  })

  it('returns averageRating=0 when provider has no reviews', async () => {
    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockResolvedValueOnce([makeProviderFixture()])
    ;(mockPrisma.providerProfile.count as jest.Mock).mockResolvedValueOnce(1)
    ;(mockPrisma.$queryRaw as jest.Mock).mockResolvedValueOnce([])

    const req = makeRequest('http://localhost/api/providers')
    const res = await providersGET(req)

    const json = await res.json()
    expect(json.providers[0].averageRating).toBe(0)
    expect(json.providers[0].reviewCount).toBe(0)
  })

  it('passes category filter to Prisma when category param is provided', async () => {
    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(mockPrisma.providerProfile.count as jest.Mock).mockResolvedValueOnce(0)

    const req = makeRequest('http://localhost/api/providers?category=NAILS')
    await providersGET(req)

    const callArgs = (mockPrisma.providerProfile.findMany as jest.Mock).mock.calls[0][0]
    expect(callArgs.where.services).toEqual(
      expect.objectContaining({ some: expect.objectContaining({ category: 'NAILS' }) }),
    )
  })

  it('passes location filter to Prisma when location param is provided', async () => {
    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(mockPrisma.providerProfile.count as jest.Mock).mockResolvedValueOnce(0)

    const req = makeRequest('http://localhost/api/providers?location=Bondi')
    await providersGET(req)

    const callArgs = (mockPrisma.providerProfile.findMany as jest.Mock).mock.calls[0][0]
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ suburb: expect.objectContaining({ contains: 'Bondi' }) }),
        expect.objectContaining({ city: expect.objectContaining({ contains: 'Bondi' }) }),
      ]),
    )
  })

  it('passes price range filter to Prisma when minPrice and maxPrice are provided', async () => {
    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(mockPrisma.providerProfile.count as jest.Mock).mockResolvedValueOnce(0)

    const req = makeRequest('http://localhost/api/providers?minPrice=100&maxPrice=300')
    await providersGET(req)

    const callArgs = (mockPrisma.providerProfile.findMany as jest.Mock).mock.calls[0][0]
    expect(callArgs.where.services).toEqual(
      expect.objectContaining({
        some: expect.objectContaining({
          price: expect.objectContaining({ gte: 100, lte: 300 }),
        }),
      }),
    )
  })

  it('respects page and limit pagination params', async () => {
    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockResolvedValueOnce([])
    ;(mockPrisma.providerProfile.count as jest.Mock).mockResolvedValueOnce(30)

    const req = makeRequest('http://localhost/api/providers?page=3&limit=10')
    const res = await providersGET(req)

    const json = await res.json()
    expect(json.page).toBe(3)
    expect(json.pages).toBe(3) // 30 / 10 = 3 pages

    const callArgs = (mockPrisma.providerProfile.findMany as jest.Mock).mock.calls[0][0]
    expect(callArgs.skip).toBe(20) // (page - 1) * limit = 2 * 10
    expect(callArgs.take).toBe(10)
  })

  it('returns 500 on database error', async () => {
    ;(mockPrisma.providerProfile.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'))

    const req = makeRequest('http://localhost/api/providers')
    const res = await providersGET(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/providers/[id]', () => {
  const params = { id: 'profile-1' }

  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when provider not found', async () => {
    ;(mockPrisma.providerProfile.findUnique as jest.Mock).mockResolvedValueOnce(null)

    const req = makeRequest('http://localhost/api/providers/nonexistent')
    const res = await providerByIdGET(req, { params: { id: 'nonexistent' } })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Provider not found')
  })

  it('returns provider profile with reviews and computed averageRating', async () => {
    const fakeProfile = {
      id: 'profile-1',
      userId: 'user-provider-1',
      city: 'Sydney',
      user: { id: 'user-provider-1', name: 'Sophie Chen' },
      services: [],
      portfolio: [],
      scoreFactors: null,
      verification: null,
    }

    const fakeReviews = [
      { id: 'rev-1', rating: 5, text: 'Amazing!', customer: { name: 'Emma' }, createdAt: new Date(), isVisible: true, aiSummary: null },
      { id: 'rev-2', rating: 4, text: 'Good', customer: { name: 'Jack' }, createdAt: new Date(), isVisible: true, aiSummary: null },
    ]

    ;(mockPrisma.providerProfile.findUnique as jest.Mock).mockResolvedValueOnce(fakeProfile)
    ;(mockPrisma.review.findMany as jest.Mock).mockResolvedValueOnce(fakeReviews)

    const req = makeRequest('http://localhost/api/providers/profile-1')
    const res = await providerByIdGET(req, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.profile.id).toBe('profile-1')
    expect(json.reviews).toHaveLength(2)
    expect(json.reviewCount).toBe(2)
    // averageRating: (5 + 4) / 2 = 4.5
    expect(json.averageRating).toBe(4.5)
    expect(json.aiSummary).toBeNull()
  })

  it('returns averageRating=0 when there are no reviews', async () => {
    const fakeProfile = {
      id: 'profile-1',
      userId: 'user-provider-1',
      user: { name: 'Sophie' },
      services: [],
      portfolio: [],
      scoreFactors: null,
      verification: null,
    }

    ;(mockPrisma.providerProfile.findUnique as jest.Mock).mockResolvedValueOnce(fakeProfile)
    ;(mockPrisma.review.findMany as jest.Mock).mockResolvedValueOnce([])

    const req = makeRequest('http://localhost/api/providers/profile-1')
    const res = await providerByIdGET(req, { params })

    const json = await res.json()
    expect(json.averageRating).toBe(0)
    expect(json.reviewCount).toBe(0)
  })

  it('returns aiSummary from most recent review when provider has 10+ reviews', async () => {
    const fakeProfile = {
      id: 'profile-1',
      userId: 'user-provider-1',
      user: { name: 'Sophie' },
      services: [],
      portfolio: [],
      scoreFactors: null,
      verification: null,
    }

    // 10 reviews, first one has an AI summary
    const reviews = Array.from({ length: 10 }, (_, i) => ({
      id: `rev-${i}`,
      rating: 5,
      text: 'Great!',
      customer: { name: 'Customer' },
      createdAt: new Date(),
      isVisible: true,
      aiSummary: i === 0 ? 'Excellent provider with consistent high ratings.' : null,
    }))

    ;(mockPrisma.providerProfile.findUnique as jest.Mock).mockResolvedValueOnce(fakeProfile)
    ;(mockPrisma.review.findMany as jest.Mock).mockResolvedValueOnce(reviews)

    const req = makeRequest('http://localhost/api/providers/profile-1')
    const res = await providerByIdGET(req, { params })

    const json = await res.json()
    expect(json.aiSummary).toBe('Excellent provider with consistent high ratings.')
  })

  it('returns 500 on database error', async () => {
    ;(mockPrisma.providerProfile.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB error'))

    const req = makeRequest('http://localhost/api/providers/profile-1')
    const res = await providerByIdGET(req, { params })

    expect(res.status).toBe(500)
  })
})
/* eslint-disable @typescript-eslint/no-explicit-any */
