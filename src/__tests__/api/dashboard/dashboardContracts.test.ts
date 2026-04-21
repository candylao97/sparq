/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dashboard data-shape contracts (item #17).
 *
 * The two dashboards (/api/dashboard/customer and /api/dashboard/provider)
 * are the highest-traffic reads in the app. Their response shapes are
 * consumed directly by client components — adding/removing/reshaping a
 * top-level key is a breaking change. This suite locks in the exact
 * top-level keys and the critical sub-shapes so schema drift is caught
 * in PR review, not by a broken production dashboard.
 *
 * We do NOT assert deep values — that's what unit tests on the math/
 * derived logic are for. We assert presence and type-shape.
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaStub: any = {
    user: { findUnique: jest.fn() },
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    review: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    notification: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    message: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    service: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    providerProfile: {
      findUnique: jest.fn(),
    },
    portfolioPhoto: {
      count: jest.fn().mockResolvedValue(0),
    },
  }
  return { prisma: prismaStub }
})

import { GET as customerGET } from '@/app/api/dashboard/customer/route'
import { GET as providerGET } from '@/app/api/dashboard/provider/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

const mp = prisma as any
const mockGetSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('GET /api/dashboard/customer — response contract', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'cust_1', role: 'CUSTOMER' },
    } as any)
    mp.user.findUnique.mockResolvedValue({
      id: 'cust_1',
      name: 'Casey',
      email: 'c@example.com',
      image: null,
      createdAt: new Date('2024-01-01'),
      customerProfile: { membership: 'FREE', savedProviders: [] },
    })
    mp.booking.findMany.mockResolvedValue([])
    mp.review.findMany.mockResolvedValue([])
    mp.notification.findMany.mockResolvedValue([])
    mp.message.groupBy.mockResolvedValue([])
  })

  it('401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await customerGET()
    expect(res.status).toBe(401)
  })

  it('401 when the user record has been deleted out from under a valid session', async () => {
    mp.user.findUnique.mockResolvedValueOnce(null)
    const res = await customerGET()
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/log out and log back in/i)
  })

  it('response has the full documented top-level shape', async () => {
    const res = await customerGET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(Object.keys(body).sort()).toEqual(
      [
        'favouriteTalents',
        'imminentBookings',
        'notifications',
        'pastBookings',
        'profile',
        'reviewsLeft',
        'spending',
        'stats',
        'unreadMessageCount',
        'unreviewedBookings',
        'upcomingBookings',
      ].sort(),
    )
  })

  it('profile object exposes the expected personal fields', async () => {
    const res = await customerGET()
    const { profile } = await res.json()
    // Assert each key individually — expect.any(Array) can be brittle
    // through JSON serialisation, so we check presence + typeof explicitly.
    expect(typeof profile.name).toBe('string')
    expect(typeof profile.email).toBe('string')
    expect(typeof profile.membership).toBe('string')
    expect(Array.isArray(profile.savedProviders)).toBe(true)
    expect(typeof profile.memberSince).toBe('string')
    // image is nullable
    expect('image' in profile).toBe(true)
  })

  it('spending rollup includes all six window buckets', async () => {
    const res = await customerGET()
    const { spending } = await res.json()
    expect(Object.keys(spending).sort()).toEqual(
      [
        'allTime',
        'averagePerBooking',
        'platformFeesSaved',
        'previousMonth',
        'previousQuarter',
        'thisMonth',
        'thisQuarter',
        'totalTips',
      ].sort(),
    )
  })

  it('stats include the key counters the UI renders', async () => {
    const res = await customerGET()
    const { stats } = await res.json()
    expect(stats).toEqual(
      expect.objectContaining({
        totalBookings: expect.any(Number),
        completedBookings: expect.any(Number),
        completedThisMonth: expect.any(Number),
        upcomingBookings: expect.any(Number),
        pendingBookings: expect.any(Number),
        uniqueTalentsBooked: expect.any(Number),
        reviewsLeft: expect.any(Number),
        unreviewed: expect.any(Number),
        memberSince: expect.any(String),
      }),
    )
  })

  it('PREMIUM members get their platform fees reflected in platformFeesSaved', async () => {
    mp.user.findUnique.mockResolvedValueOnce({
      id: 'cust_1',
      name: 'Premium',
      email: 'p@example.com',
      image: null,
      createdAt: new Date(),
      customerProfile: { membership: 'PREMIUM', savedProviders: [] },
    })
    mp.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b1',
        date: new Date('2024-10-15'),
        time: '10:00',
        totalPrice: 120,
        platformFee: 18,
        tipAmount: 0,
        status: 'COMPLETED',
        locationType: 'HOME',
        address: '1 Main St',
        notes: null,
        serviceId: 'svc_1',
        service: { title: 'Svc', duration: 60, category: 'BEAUTY' },
        providerId: 'prov_1',
        provider: { name: 'Lily', image: null, providerProfile: { tier: 'PRO', suburb: null } },
        review: null,
      },
    ])
    const res = await customerGET()
    const { spending } = await res.json()
    expect(spending.platformFeesSaved).toBeCloseTo(18)
  })

  it('FREE member sees platformFeesSaved === 0 regardless of spend', async () => {
    mp.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b1',
        date: new Date(),
        time: '10:00',
        totalPrice: 120,
        platformFee: 18,
        tipAmount: 0,
        status: 'COMPLETED',
        locationType: 'HOME',
        address: '1 Main',
        notes: null,
        serviceId: 'svc_1',
        service: { title: 'Svc', duration: 60, category: 'BEAUTY' },
        providerId: 'prov_1',
        provider: { name: 'L', image: null, providerProfile: { tier: 'PRO', suburb: null } },
        review: null,
      },
    ])
    const res = await customerGET()
    const { spending } = await res.json()
    expect(spending.platformFeesSaved).toBe(0)
  })
})

describe('GET /api/dashboard/provider — response contract', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      user: { id: 'prov_1', role: 'PROVIDER' },
    } as any)
    mp.providerProfile.findUnique.mockResolvedValue({
      id: 'pp_1',
      tier: 'PRO',
      isVerified: true,
      bio: 'test',
      tagline: null,
      suburb: 'Bondi',
      city: 'Sydney',
      serviceRadius: 10,
      latitude: -33,
      longitude: 151,
      studioAddress: null,
      offerAtHome: true,
      offerAtStudio: false,
      responseTimeHours: 2,
      completionRate: 95,
      scoreFactors: null,
      services: [],
      portfolio: [],
      verification: null,
      stripeAccountId: 'acct_1',
    })
    mp.booking.findMany.mockResolvedValue([])
    mp.booking.groupBy.mockResolvedValue([])
    mp.review.findMany.mockResolvedValue([])
    mp.review.findFirst.mockResolvedValue(null)
    mp.review.count.mockResolvedValue(0)
    mp.portfolioPhoto.count.mockResolvedValue(0)
  })

  it('401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await providerGET()
    expect(res.status).toBe(401)
  })

  it('404 when the user has no provider profile', async () => {
    mp.providerProfile.findUnique.mockResolvedValueOnce(null)
    const res = await providerGET()
    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/not found/i)
  })

  it('response has the full documented top-level shape', async () => {
    const res = await providerGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(
      [
        'aiReviewSummary',
        'earnings',
        'pendingBookings',
        'profile',
        'recentReviews',
        'stats',
        'todayBookings',
        'unrespondedReviews',
      ].sort(),
    )
  })

  it('earnings bucket exposes today/week/month/allTime/previousMonth/last3MonthsAvg', async () => {
    const res = await providerGET()
    const { earnings } = await res.json()
    expect(Object.keys(earnings).sort()).toEqual(
      [
        'allTime',
        'last3MonthsAvg',
        'month',
        'previousMonth',
        'today',
        'week',
      ].sort(),
    )
  })

  it('profile exposes the KYC/payout fields the UI gates on', async () => {
    const res = await providerGET()
    const { profile } = await res.json()
    expect(profile).toEqual(
      expect.objectContaining({
        tier: expect.any(String),
        isVerified: expect.any(Boolean),
        completionRate: expect.any(Number),
        responseTimeHours: expect.any(Number),
        stripeAccountId: expect.anything(),
        verification: null, // when not set; null is a valid value
      }),
    )
  })

  it('stats include the counters + averageRating the header renders', async () => {
    const res = await providerGET()
    const { stats } = await res.json()
    expect(stats).toEqual(
      expect.objectContaining({
        totalBookings: expect.any(Number),
        pendingBookings: expect.any(Number),
        completedBookings: expect.any(Number),
        completedThisMonth: expect.any(Number),
        averageRating: expect.any(Number),
        totalReviews: expect.any(Number),
        portfolioPhotoCount: expect.any(Number),
        avgResponseTimeHours: expect.any(Number),
      }),
    )
  })

  it('pendingBookings entries include the minutesUntilExpiry UI needs for the countdown', async () => {
    mp.booking.findMany.mockResolvedValueOnce([
      {
        id: 'b_pending',
        customerId: 'c_1',
        providerId: 'prov_1',
        date: new Date(),
        time: '10:00',
        totalPrice: 100,
        acceptDeadline: new Date(Date.now() + 3600_000), // 1h from now
        notes: null,
        status: 'PENDING',
        locationType: 'HOME',
        address: null,
        service: { title: 'S', duration: 60, category: 'BEAUTY' },
        customer: { name: 'C', image: null },
      },
    ])
    const res = await providerGET()
    const { pendingBookings } = await res.json()
    expect(pendingBookings).toHaveLength(1)
    expect(pendingBookings[0]).toEqual(
      expect.objectContaining({
        id: 'b_pending',
        minutesUntilExpiry: expect.any(Number),
        acceptDeadline: expect.any(String),
        repeatFanCount: expect.any(Number),
      }),
    )
    // The countdown must be ≈60 minutes from now (not zero, not negative).
    expect(pendingBookings[0].minutesUntilExpiry).toBeGreaterThan(55)
    expect(pendingBookings[0].minutesUntilExpiry).toBeLessThanOrEqual(60)
  })
})
