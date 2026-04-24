import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { utcToSydneyDateStr } from '@/lib/booking-time'

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

    // UX-H2: Compute next available date (next 30 days, skip blocked overrides).
    // Batch B Item 3: the whole walk is now Sydney-local-safe. Previously
    // this used server-local `new Date()` + `toISOString().split('T')[0]`,
    // which on a Sydney-zone server produced UTC-shifted date strings one
    // day behind the artist's actual calendar day. The booking-flow
    // availability endpoint computes in Sydney time; this now matches.
    let nextAvailableDate: string | null = null
    try {
      // "today" expressed as Sydney date; date keys are Sydney-local calendar days.
      const todaySydney = utcToSydneyDateStr(new Date())
      // parseSydneyDateAsNoonUtc: produces the noon-UTC Date we use as the
      // DB range bound. Noon ensures a single unambiguous UTC instant per
      // Sydney calendar day (avoids DST midnight corner cases).
      const parseNoonUtc = (s: string) => {
        const [y, m, d] = s.split('-').map(Number)
        return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      }
      const addDaysSydney = (s: string, i: number) => {
        const [y, m, d] = s.split('-').map(Number)
        const n = new Date(Date.UTC(y, m - 1, d + i, 12, 0, 0))
        return utcToSydneyDateStr(n)
      }
      const rangeStart = parseNoonUtc(todaySydney)
      const rangeEnd = parseNoonUtc(addDaysSydney(todaySydney, 30))

      // Load weekly defaults (sentinel dates).
      const weeklyDefaults = await prisma.availability.findMany({
        where: {
          providerProfileId: profile.id,
          date: { gte: new Date(Date.UTC(2000, 0, 2)), lte: new Date(Date.UTC(2000, 0, 10)) },
        },
      })
      const defaultByDow: Record<number, boolean> = {}
      for (const d of weeklyDefaults) {
        // Sentinels are stored at noon UTC so getUTCDay gives the intended DOW.
        defaultByDow[d.date.getUTCDay()] = !d.isBlocked && d.timeSlots.length > 0
      }

      // Load date overrides in range
      const overrides = await prisma.availability.findMany({
        where: {
          providerProfileId: profile.id,
          date: { gte: rangeStart, lte: rangeEnd },
        },
        select: { date: true, isBlocked: true, timeSlots: true },
      })
      const overrideMap: Record<string, { isBlocked: boolean; slots: number }> = {}
      for (const o of overrides) {
        // Key by the Sydney calendar day to match the walk below.
        const key = utcToSydneyDateStr(o.date)
        overrideMap[key] = { isBlocked: o.isBlocked, slots: o.timeSlots.length }
      }

      // Load already-booked slots in range (currently unused by this walk
      // but kept for future slot-count-aware availability decisions).
      await prisma.booking.findMany({
        where: {
          providerUserId: profile.userId,
          date: { gte: rangeStart, lte: rangeEnd },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { date: true, time: true },
      })

      // Walk next 30 calendar days in Sydney and find first available.
      for (let i = 0; i <= 30; i++) {
        const key = addDaysSydney(todaySydney, i)
        // DOW via noon-UTC of this Sydney date: unambiguous, DST-safe.
        const dow = parseNoonUtc(key).getUTCDay()
        const override = overrideMap[key]

        const isAvailable = override
          ? !override.isBlocked && override.slots > 0
          : defaultByDow[dow] === true

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
