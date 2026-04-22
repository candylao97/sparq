import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerId = session.user.id

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = thisMonthStart
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ── Profile Views: real view count from ProviderProfile.profileViews ────────
  const [profileViewsThis, profileViewsLast] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId: providerId },
      select: { profileViews: true },
    }).then(p => p?.profileViews ?? 0),
    Promise.resolve(0), // No historical breakdown yet — total is shown as current period
  ])

  // ── New Clients: customers whose first booking with this provider is this/last month ──
  // Get all bookings grouped by customer, ordered by createdAt
  const allBookingsForProvider = await prisma.booking.findMany({
    where: { providerId },
    select: { customerId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // Build a map: customerId -> first booking date
  const firstBookingByCustomer = new Map<string, Date>()
  for (const b of allBookingsForProvider) {
    if (!firstBookingByCustomer.has(b.customerId)) {
      firstBookingByCustomer.set(b.customerId, b.createdAt)
    }
  }

  let newClientsThis = 0
  let newClientsLast = 0
  for (const firstDate of Array.from(firstBookingByCustomer.values())) {
    if (firstDate >= thisMonthStart) newClientsThis++
    else if (firstDate >= lastMonthStart && firstDate < lastMonthEnd) newClientsLast++
  }

  // ── Revenue & Avg Booking Value: COMPLETED bookings ────────────────────────
  const [completedThis, completedLast] = await Promise.all([
    prisma.booking.findMany({
      where: {
        providerId,
        status: 'COMPLETED',
        completedAt: { gte: thisMonthStart },
      },
      select: { totalPrice: true },
    }),
    prisma.booking.findMany({
      where: {
        providerId,
        status: 'COMPLETED',
        completedAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      select: { totalPrice: true },
    }),
  ])

  // Use integer cents to avoid floating point drift
  const revenueCentsThis = completedThis.reduce(
    (sum, b) => sum + Math.round(b.totalPrice * 100),
    0,
  )
  const revenueCentsLast = completedLast.reduce(
    (sum, b) => sum + Math.round(b.totalPrice * 100),
    0,
  )
  const revenueThis = revenueCentsThis / 100
  const revenueLast = revenueCentsLast / 100

  const avgBookingThis =
    completedThis.length > 0 ? revenueThis / completedThis.length : 0
  const avgBookingLast =
    completedLast.length > 0 ? revenueLast / completedLast.length : 0

  // ── Repeat Rate ────────────────────────────────────────────────────────────
  // This month's cohort: clients with ≥1 completed booking up to now
  const completedAllTime = await prisma.booking.findMany({
    where: {
      providerId,
      status: 'COMPLETED',
    },
    select: { customerId: true, completedAt: true },
  })

  // Helper to compute repeat rate for a cohort (bookings completed before cutoff)
  function computeRepeatRate(bookings: { customerId: string; completedAt: Date | null }[]) {
    const countPerCustomer = new Map<string, number>()
    for (const b of bookings) {
      countPerCustomer.set(b.customerId, (countPerCustomer.get(b.customerId) ?? 0) + 1)
    }
    const total = countPerCustomer.size
    if (total === 0) return 0
    const repeats = Array.from(countPerCustomer.values()).filter((c) => c >= 2).length
    return Math.round((repeats / total) * 1000) / 10 // 1 decimal place
  }

  const completedThisMonthOrBefore = completedAllTime.filter(
    (b) => b.completedAt && b.completedAt < new Date(now.getFullYear(), now.getMonth() + 1, 1),
  )
  const completedLastMonthOrBefore = completedAllTime.filter(
    (b) => b.completedAt && b.completedAt < lastMonthEnd,
  )

  const repeatRateThis = computeRepeatRate(completedThisMonthOrBefore)
  const repeatRateLast = computeRepeatRate(completedLastMonthOrBefore)

  // ── Recent Bookings: last 30 days by date ──────────────────────────────────
  const recentCompleted = await prisma.booking.findMany({
    where: {
      providerId,
      status: 'COMPLETED',
      completedAt: { gte: thirtyDaysAgo },
    },
    select: { completedAt: true, totalPrice: true },
    orderBy: { completedAt: 'asc' },
  })

  const dailyMap = new Map<string, { revenue: number; bookingCount: number }>()
  for (const b of recentCompleted) {
    if (!b.completedAt) continue
    const dateStr = b.completedAt.toISOString().slice(0, 10) // YYYY-MM-DD
    const existing = dailyMap.get(dateStr) ?? { revenue: 0, bookingCount: 0 }
    dailyMap.set(dateStr, {
      revenue: existing.revenue + b.totalPrice,
      bookingCount: existing.bookingCount + 1,
    })
  }

  const recentBookings = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      revenue: Math.round(stats.revenue * 100) / 100,
      bookingCount: stats.bookingCount,
    }))

  return NextResponse.json({
    kpis: {
      profileViews: { value: profileViewsThis, prevValue: profileViewsLast },
      newClients: { value: newClientsThis, prevValue: newClientsLast },
      revenue: { value: revenueThis, prevValue: revenueLast },
      avgBookingValue: { value: avgBookingThis, prevValue: avgBookingLast },
      repeatRate: { value: repeatRateThis, prevValue: repeatRateLast },
    },
    recentBookings,
  })
}
