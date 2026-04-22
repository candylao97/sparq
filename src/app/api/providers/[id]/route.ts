import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        services: { where: { isActive: true, isDeleted: false } },
        portfolio: { orderBy: { order: 'asc' } },
        scoreFactors: true,
        verification: true,
      },
    })

    if (!profile) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    // Check if requesting user has a confirmed/completed booking with this provider
    const session = await getServerSession(authOptions)
    let showContactInfo = false
    if (session?.user?.id) {
      const confirmedBooking = await prisma.booking.findFirst({
        where: {
          customerId: session.user.id,
          providerUserId: profile.userId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
      })
      showContactInfo = !!confirmedBooking
    }

    // Strip contact info from user data unless authorized
    const sanitizedProfile = {
      ...profile,
      studioAddress: showContactInfo ? profile.studioAddress : null,
      user: {
        ...profile.user,
        ...(showContactInfo ? {} : { phone: null, email: null }),
      },
    }

    const reviews = await prisma.review.findMany({
      where: {
        booking: { providerUserId: profile.userId },
        isVisible: true,
      },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    // T&S-R2: Compute "recent rating" (last 90 days) to surface if it differs from all-time
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const recentReviews = reviews.filter(r => new Date(r.createdAt) >= ninetyDaysAgo)
    const recentRating = recentReviews.length >= 3
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
      : null

    // Show AI summary from ProviderProfile (canonical), falling back to scanning reviews for legacy data
    const aiSummary = profile.aiSummary ?? reviews.find(r => r.aiSummary)?.aiSummary ?? null

    // UX-M6: Check if provider has any non-blocked availability slots configured
    // (either weekly defaults or date-specific overrides). Single efficient query.
    const availabilityRecord = await prisma.availability.findFirst({
      where: {
        providerProfileId: profile.id,
        isBlocked: false,
        timeSlots: { isEmpty: false },
      },
    })
    const hasUpcomingAvailability = availabilityRecord !== null

    // UX-H2: Compute next available date (next 30 days, skip blocked overrides)
    let nextAvailableDate: string | null = null
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const thirtyDaysOut = new Date(today)
      thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

      // Load weekly defaults (sentinel dates)
      const weeklyDefaults = await prisma.availability.findMany({
        where: {
          providerProfileId: profile.id,
          date: { gte: new Date(Date.UTC(2000, 0, 2)), lte: new Date(Date.UTC(2000, 0, 10)) },
        },
      })
      const defaultByDow: Record<number, boolean> = {}
      for (const d of weeklyDefaults) {
        defaultByDow[d.date.getDay()] = !d.isBlocked && d.timeSlots.length > 0
      }

      // Load date overrides in range
      const overrides = await prisma.availability.findMany({
        where: {
          providerProfileId: profile.id,
          date: { gte: today, lte: thirtyDaysOut },
        },
        select: { date: true, isBlocked: true, timeSlots: true },
      })
      const overrideMap: Record<string, { isBlocked: boolean; slots: number }> = {}
      for (const o of overrides) {
        const key = o.date.toISOString().split('T')[0]
        overrideMap[key] = { isBlocked: o.isBlocked, slots: o.timeSlots.length }
      }

      // Load already-booked slots in range
      const bookedSlots = await prisma.booking.findMany({
        where: {
          providerUserId: profile.userId,
          date: { gte: today, lte: thirtyDaysOut },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { date: true, time: true },
      })
      const bookedByDate: Record<string, Set<string>> = {}
      for (const b of bookedSlots) {
        const key = b.date.toISOString().split('T')[0]
        if (!bookedByDate[key]) bookedByDate[key] = new Set()
        bookedByDate[key].add(b.time)
      }

      // Walk next 30 days and find first available
      for (let i = 0; i <= 30; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        const key = d.toISOString().split('T')[0]
        const dow = d.getDay()
        const override = overrideMap[key]

        let isAvailable: boolean
        if (override) {
          isAvailable = !override.isBlocked && override.slots > 0
        } else {
          isAvailable = defaultByDow[dow] === true
        }

        if (isAvailable) {
          nextAvailableDate = key
          break
        }
      }
    } catch {
      // Non-critical — leave nextAvailableDate as null
    }

    return NextResponse.json({
      profile: sanitizedProfile,
      reviews,
      averageRating: avgRating,
      reviewCount: reviews.length,
      recentRating,         // T&S-R2: recent 90-day average (null if < 3 reviews)
      recentReviewCount: recentReviews.length,
      aiSummary,
      hasUpcomingAvailability,
      nextAvailableDate,    // UX-H2: next open date in next 30 days, or null
    })
  } catch (error) {
    console.error('Provider detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 })
  }
}
