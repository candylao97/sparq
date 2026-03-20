import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const prevQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
    const prevQuarterEnd = new Date(quarterStart.getTime() - 1)

    const [user, bookings, reviewsByCustomer, notifications, unreadMessageGroups] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { customerProfile: true },
      }),
      prisma.booking.findMany({
        where: { customerId: session.user.id },
        include: {
          service: true,
          provider: { include: { providerProfile: { select: { tier: true, suburb: true } } } },
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.findMany({
        where: { customerId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          booking: {
            include: {
              service: { select: { title: true } },
              provider: { select: { name: true, image: true } },
            },
          },
        },
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        take: 15,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.groupBy({
        by: ['bookingId'],
        where: {
          booking: { customerId: session.user.id },
          senderId: { not: session.user.id },
          read: false,
        },
        _count: { id: true },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please log out and log back in.' }, { status: 401 })
    }

    // Build unread message lookup: bookingId -> count
    const unreadMap = new Map<string, number>()
    for (const g of unreadMessageGroups) {
      unreadMap.set(g.bookingId, g._count.id)
    }

    // Map booking to response shape
    const mapBooking = (b: typeof bookings[0]) => {
      return {
        id: b.id,
        date: b.date.toISOString(),
        time: b.time,
        totalPrice: b.totalPrice,
        platformFee: b.platformFee,
        tipAmount: b.tipAmount,
        status: b.status,
        locationType: b.locationType,
        address: ['CONFIRMED', 'COMPLETED'].includes(b.status) ? b.address : null,
        notes: b.notes,
        service: { id: b.serviceId, title: b.service.title, duration: b.service.duration, category: b.service.category },
        provider: {
          id: b.providerId,
          name: b.provider.name || 'Artist',
          image: b.provider.image,
          tier: b.provider.providerProfile?.tier || 'NEWCOMER',
          suburb: b.provider.providerProfile?.suburb || null,
        },
        review: b.review ? {
          id: b.review.id,
          rating: b.review.rating,
          text: b.review.text,
          providerResponse: b.review.providerResponse,
        } : null,
        unreadMessageCount: unreadMap.get(b.id) || 0,
      }
    }

    // Split bookings
    const upcoming = bookings
      .filter(b => ['PENDING', 'CONFIRMED'].includes(b.status) && b.date >= todayStart)
      .sort((a, b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time))
      .map(mapBooking)

    const past = bookings
      .filter(b => ['COMPLETED', 'CANCELLED', 'DECLINED'].includes(b.status))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(mapBooking)

    const unreviewed = bookings
      .filter(b => b.status === 'COMPLETED' && !b.review)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(mapBooking)

    const completed = bookings.filter(b => b.status === 'COMPLETED')

    // Build favourite talents from completed bookings
    const talentMap = new Map<string, {
      id: string; name: string; image: string | null; tier: string; suburb: string | null
      bookingCount: number; lastBookingDate: Date; services: Map<string, number>; ratings: number[]
    }>()

    for (const b of completed) {
      const existing = talentMap.get(b.providerId)
      if (existing) {
        existing.bookingCount++
        if (b.date > existing.lastBookingDate) existing.lastBookingDate = b.date
        existing.services.set(b.service.title, (existing.services.get(b.service.title) || 0) + 1)
        if (b.review) existing.ratings.push(b.review.rating)
      } else {
        const services = new Map<string, number>()
        services.set(b.service.title, 1)
        talentMap.set(b.providerId, {
          id: b.providerId,
          name: b.provider.name || 'Artist',
          image: b.provider.image,
          tier: b.provider.providerProfile?.tier || 'NEWCOMER',
          suburb: b.provider.providerProfile?.suburb || null,
          bookingCount: 1,
          lastBookingDate: b.date,
          services,
          ratings: b.review ? [b.review.rating] : [],
        })
      }
    }

    const favouriteTalents = Array.from(talentMap.values())
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 8)
      .map(t => {
        let topService = ''
        let maxCount = 0
        for (const [svc, count] of Array.from(t.services)) {
          if (count > maxCount) { topService = svc; maxCount = count }
        }
        return {
          id: t.id,
          name: t.name,
          image: t.image,
          tier: t.tier,
          suburb: t.suburb,
          bookingCount: t.bookingCount,
          lastBookingDate: t.lastBookingDate.toISOString(),
          topService,
          averageRating: t.ratings.length > 0
            ? t.ratings.reduce((s, r) => s + r, 0) / t.ratings.length
            : 0,
        }
      })

    // Spending calculations
    const calcSpend = (filtered: typeof completed) =>
      filtered.reduce((s, b) => s + b.totalPrice, 0)

    const completedThisMonth = completed.filter(b => b.date >= monthStart)
    const completedPrevMonth = completed.filter(b => b.date >= prevMonthStart && b.date <= prevMonthEnd)
    const completedThisQuarter = completed.filter(b => b.date >= quarterStart)
    const completedPrevQuarter = completed.filter(b => b.date >= prevQuarterStart && b.date <= prevQuarterEnd)

    const spending = {
      allTime: calcSpend(completed),
      thisMonth: calcSpend(completedThisMonth),
      previousMonth: calcSpend(completedPrevMonth),
      thisQuarter: calcSpend(completedThisQuarter),
      previousQuarter: calcSpend(completedPrevQuarter),
      averagePerBooking: completed.length > 0 ? calcSpend(completed) / completed.length : 0,
      totalTips: completed.reduce((s, b) => s + b.tipAmount, 0),
      platformFeesSaved: user.customerProfile?.membership === 'PREMIUM'
        ? completed.reduce((s, b) => s + b.platformFee, 0)
        : 0,
    }

    // Reviews left by this customer
    const reviewsLeft = reviewsByCustomer.map(r => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      providerResponse: r.providerResponse,
      createdAt: r.createdAt.toISOString(),
      provider: { name: r.booking.provider.name || 'Artist', image: r.booking.provider.image },
      service: { title: r.booking.service.title },
    }))

    return NextResponse.json({
      profile: {
        name: user.name || '',
        email: user.email || '',
        image: user.image,
        membership: user.customerProfile?.membership || 'FREE',
        savedProviders: user.customerProfile?.savedProviders || [],
        memberSince: user.createdAt.toISOString(),
      },
      upcomingBookings: upcoming,
      pastBookings: past.slice(0, 20),
      unreviewedBookings: unreviewed.slice(0, 5),
      reviewsLeft,
      favouriteTalents,
      spending,
      stats: {
        totalBookings: bookings.length,
        completedBookings: completed.length,
        completedThisMonth: completedThisMonth.length,
        upcomingBookings: upcoming.length,
        pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
        uniqueTalentsBooked: talentMap.size,
        reviewsLeft: reviewsByCustomer.length,
        unreviewed: unreviewed.length,
        memberSince: user.createdAt.toISOString(),
      },
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadMessageCount: unreadMessageGroups.reduce((s, g) => s + g._count.id, 0),
    })
  } catch (error) {
    console.error('Customer dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}
