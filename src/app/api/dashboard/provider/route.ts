import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeNextPayoutSummary } from '@/lib/next-payout'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setHours(23, 59, 59, 999)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    const [profile, bookings, reviews, unrespondedReviews, customerBookingCounts, aiSummaryReview, queuedPayouts] = await Promise.all([
      prisma.providerProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          scoreFactors: true,
          services: { where: { isActive: true } },
          verification: true,
          portfolio: { take: 4, orderBy: { order: 'asc' } },
        },
      }),
      prisma.booking.findMany({
        where: { providerId: session.user.id },
        include: { service: true, customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.findMany({
        where: { booking: { providerId: session.user.id }, isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: true, booking: { select: { service: { select: { title: true } } } } },
      }),
      prisma.review.findMany({
        where: {
          booking: { providerId: session.user.id },
          isVisible: true,
          providerResponse: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: true, booking: { select: { service: { select: { title: true } } } } },
      }),
      prisma.booking.groupBy({
        by: ['customerId'],
        where: {
          providerId: session.user.id,
          status: { in: ['COMPLETED', 'CONFIRMED'] },
        },
        _count: { id: true },
      }),
      prisma.review.findFirst({
        where: {
          booking: { providerId: session.user.id },
          isVisible: true,
          aiSummary: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: { aiSummary: true },
      }),
      // AUDIT-011: Payouts queued for this talent (next payout surfacing).
      // We fetch all non-terminal payouts so the helper can total them up,
      // not just the earliest — the aside widget shows "$X queued across Y".
      prisma.payout.findMany({
        where: {
          providerId: session.user.id,
          status: { in: ['SCHEDULED', 'PROCESSING'] },
        },
        select: {
          id: true,
          amount: true,
          status: true,
          scheduledAt: true,
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ])

    // AUDIT-011: Collapse queued payouts into the single summary the UI needs.
    const nextPayout = computeNextPayoutSummary(queuedPayouts, now)

    if (!profile) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
    }

    // Portfolio count (needs profile.id)
    const actualPortfolioCount = await prisma.portfolioPhoto.count({ where: { providerId: profile.id } }).catch(() => 0)

    // Build repeat fan lookup: customerId -> bookingCount
    const repeatFanMap = new Map<string, number>()
    for (const c of customerBookingCounts) {
      repeatFanMap.set(c.customerId, c._count.id)
    }

    const completed = bookings.filter(b => b.status === 'COMPLETED')

    // Earnings calculations
    const calcEarnings = (filtered: typeof completed) =>
      filtered.reduce((s, b) => s + b.totalPrice * (1 - b.commissionRate), 0)

    const prevMonthCompleted = completed.filter(b => b.date >= prevMonthStart && b.date <= prevMonthEnd)
    const last3MonthsCompleted = completed.filter(b => b.date >= threeMonthsAgo)

    const earnings = {
      today: calcEarnings(completed.filter(b => b.date >= todayStart)),
      week: calcEarnings(completed.filter(b => b.date >= weekStart)),
      month: calcEarnings(completed.filter(b => b.date >= monthStart)),
      allTime: calcEarnings(completed),
      previousMonth: calcEarnings(prevMonthCompleted),
      last3MonthsAvg: last3MonthsCompleted.length > 0
        ? calcEarnings(last3MonthsCompleted) / 3
        : 0,
    }

    // Pending bookings with repeat fan count and expiry
    // P1-E: Include RESCHEDULE_REQUESTED so provider can accept/decline from bookings page
    const pendingBookings = bookings
      .filter(b => b.status === 'PENDING' || b.status === 'RESCHEDULE_REQUESTED')
      .map(b => {
        const minutesUntilExpiry = b.acceptDeadline
          ? Math.max(0, Math.round((new Date(b.acceptDeadline).getTime() - now.getTime()) / 60000))
          : null
        return {
          id: b.id,
          date: b.date.toISOString(),
          time: b.time,
          totalPrice: b.totalPrice,
          acceptDeadline: b.acceptDeadline?.toISOString() || null,
          notes: b.notes,
          status: b.status,
          locationType: b.locationType,
          address: ['CONFIRMED', 'COMPLETED'].includes(b.status) ? b.address : null,
          rescheduleDate: b.rescheduleDate?.toISOString() || null,
          rescheduleTime: b.rescheduleTime || null,
          rescheduleReason: b.rescheduleReason || null,
          service: { title: b.service.title, duration: b.service.duration, category: b.service.category },
          customer: { id: b.customerId, name: b.customer.name || 'Client', image: b.customer.image },
          repeatFanCount: repeatFanMap.get(b.customerId) || 0,
          minutesUntilExpiry,
        }
      })

    // Today's confirmed bookings
    const todayBookings = bookings
      .filter(b => (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.date >= todayStart && b.date <= todayEnd)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(b => ({
        id: b.id,
        date: b.date.toISOString(),
        time: b.time,
        totalPrice: b.totalPrice,
        locationType: b.locationType,
        address: ['CONFIRMED', 'COMPLETED'].includes(b.status) ? b.address : null,
        notes: b.notes,
        status: b.status,
        service: { title: b.service.title, duration: b.service.duration, category: b.service.category },
        customer: { id: b.customerId, name: b.customer.name || 'Client', image: b.customer.image },
        repeatFanCount: repeatFanMap.get(b.customerId) || 0,
      }))

    // Stats
    const allReviews = await prisma.review.count({
      where: { booking: { providerId: session.user.id }, isVisible: true },
    })
    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0
    const completedThisMonth = completed.filter(b => b.date >= monthStart).length

    // M-2: Compute tip stats from completed bookings
    const completedWithTip = completed.filter(b => (b.tipAmount ?? 0) > 0)
    const totalTips = completedWithTip.reduce((s, b) => s + (b.tipAmount ?? 0), 0)
    const tipStats = {
      totalTips,
      tipRate: completed.length > 0 ? Math.round((completedWithTip.length / completed.length) * 100) : 0,
      avgTip: completedWithTip.length > 0 ? Math.round((totalTips / completedWithTip.length) * 100) / 100 : 0,
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        tier: profile.tier,
        isVerified: profile.isVerified,
        bio: profile.bio,
        tagline: profile.tagline,
        suburb: profile.suburb,
        city: profile.city,
        serviceRadius: profile.serviceRadius,
        latitude: profile.latitude,
        longitude: profile.longitude,
        studioAddress: profile.studioAddress,
        offerAtHome: profile.offerAtHome,
        offerAtStudio: profile.offerAtStudio,
        responseTimeHours: profile.responseTimeHours,
        completionRate: profile.completionRate,
        cancellationCount: profile.cancellationCount,
        cancellationCountResetAt: profile.cancellationCountResetAt?.toISOString() ?? null,
        scoreFactors: profile.scoreFactors,
        services: profile.services,
        portfolio: profile.portfolio.map(p => ({ id: p.id, url: p.url, caption: p.caption })),
        verification: profile.verification ? {
          status: profile.verification.status,
          stripeVerificationSessionId: profile.verification.stripeVerificationSessionId,
        } : null,
        stripeAccountId: profile.stripeAccountId,
        isFeatured: profile.isFeatured,
        accountStatus: profile.accountStatus,
        suspendReason: profile.suspendReason,
      },
      earnings,
      pendingBookings,
      todayBookings,
      recentReviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        providerResponse: r.providerResponse,
        createdAt: r.createdAt.toISOString(),
        customer: { name: r.customer.name || 'Client', image: r.customer.image },
        booking: r.booking ? { service: { title: r.booking.service.title } } : undefined,
      })),
      unrespondedReviews: unrespondedReviews.map(r => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        providerResponse: null,
        createdAt: r.createdAt.toISOString(),
        customer: { name: r.customer.name || 'Client', image: r.customer.image },
        booking: r.booking ? { service: { title: r.booking.service.title } } : undefined,
      })),
      aiReviewSummary: aiSummaryReview?.aiSummary || null,
      nextPayout,
      tipStats,
      stats: {
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        completedBookings: completed.length,
        completedThisMonth,
        averageRating: avgRating,
        totalReviews: allReviews,
        portfolioPhotoCount: actualPortfolioCount,
        avgResponseTimeHours: profile.responseTimeHours,
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}
