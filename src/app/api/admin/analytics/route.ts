import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Monthly revenue — last 12 months ─────────────────────────────────────
  let monthlyRevenue: Array<{
    month: string
    gmv: number
    bookings: number
    newProviders: number
    newCustomers: number
  }> = []

  try {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const [completedBookings, newProvidersRaw, newCustomersRaw] = await Promise.all([
      prisma.booking.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: twelveMonthsAgo },
        },
        select: { totalPrice: true, completedAt: true },
      }),
      prisma.providerProfile.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
      prisma.user.findMany({
        where: {
          role: { in: ['CUSTOMER', 'BOTH'] },
          createdAt: { gte: twelveMonthsAgo },
        },
        select: { createdAt: true },
      }),
    ])

    // Build month buckets for last 12 months
    const buckets: Record<
      string,
      { gmv: number; bookings: number; newProviders: number; newCustomers: number }
    > = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets[key] = { gmv: 0, bookings: 0, newProviders: 0, newCustomers: 0 }
    }

    for (const b of completedBookings) {
      const dt = b.completedAt ?? null
      if (!dt) continue
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      if (buckets[key]) {
        // Integer-safe cent arithmetic: totalPrice is in dollars (float), sum directly
        buckets[key].gmv += b.totalPrice
        buckets[key].bookings += 1
      }
    }
    for (const p of newProvidersRaw) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (buckets[key]) buckets[key].newProviders += 1
    }
    for (const u of newCustomersRaw) {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (buckets[key]) buckets[key].newCustomers += 1
    }

    monthlyRevenue = Object.entries(buckets).map(([month, v]) => ({ month, ...v }))
  } catch (e) {
    console.error('Analytics monthlyRevenue error:', e)
  }

  // ── Category breakdown ────────────────────────────────────────────────────
  let categoryBreakdown: Array<{ category: string; bookings: number; gmv: number }> = []

  try {
    const bookingsWithService = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: {
        totalPrice: true,
        service: { select: { category: true } },
      },
    })

    const catMap: Record<string, { bookings: number; gmv: number }> = {}
    for (const b of bookingsWithService) {
      const cat = b.service.category as string
      if (!catMap[cat]) catMap[cat] = { bookings: 0, gmv: 0 }
      catMap[cat].bookings += 1
      catMap[cat].gmv += b.totalPrice
    }

    categoryBreakdown = Object.entries(catMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.bookings - a.bookings)
  } catch (e) {
    console.error('Analytics categoryBreakdown error:', e)
  }

  // ── Top suburbs ───────────────────────────────────────────────────────────
  let topSuburbs: Array<{ suburb: string; bookings: number }> = []

  try {
    // Join completed bookings → provider user → providerProfile for suburb
    const bookingsWithSuburb = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: {
        provider: {
          select: {
            providerProfile: { select: { suburb: true } },
          },
        },
      },
    })

    const suburbMap: Record<string, number> = {}
    for (const b of bookingsWithSuburb) {
      const suburb = b.provider.providerProfile?.suburb
      if (!suburb) continue
      suburbMap[suburb] = (suburbMap[suburb] ?? 0) + 1
    }

    topSuburbs = Object.entries(suburbMap)
      .map(([suburb, bookings]) => ({ suburb, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)
  } catch (e) {
    console.error('Analytics topSuburbs error:', e)
  }

  // ── Funnel (last 30 days) ─────────────────────────────────────────────────
  let funnel = { newUsers: 0, newProviders: 0, firstBookings: 0, completedBookings: 0 }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [newUsers, newProviders, recentBookings] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.providerProfile.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.booking.findMany({
        where: {
          status: { in: ['COMPLETED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { customerId: true },
      }),
    ])

    // First bookings: customers who have exactly 1 completed booking ever
    // (meaning this was their first — we check lifetime count)
    const customerIds = Array.from(new Set(recentBookings.map(b => b.customerId)))
    let firstBookingsCount = 0
    if (customerIds.length > 0) {
      const lifetimeCounts = await prisma.booking.groupBy({
        by: ['customerId'],
        where: {
          customerId: { in: customerIds },
          status: 'COMPLETED',
        },
        _count: { id: true },
      })
      for (const row of lifetimeCounts) {
        if (row._count.id === 1) firstBookingsCount += 1
      }
    }

    const completedCount = recentBookings.length

    funnel = {
      newUsers,
      newProviders,
      firstBookings: firstBookingsCount,
      completedBookings: completedCount,
    }
  } catch (e) {
    console.error('Analytics funnel error:', e)
  }

  // ── Platform health ───────────────────────────────────────────────────────
  let health = {
    avgResponseTimeHours: 0,
    avgCompletionRate: 0,
    openDisputes: 0,
    pendingKyc: 0,
  }

  try {
    const [activeProviders, openDisputes, pendingKyc] = await Promise.all([
      prisma.providerProfile.findMany({
        where: { accountStatus: 'ACTIVE' },
        select: { responseTimeHours: true, completionRate: true },
      }),
      prisma.dispute.count({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      prisma.kYCRecord.count({
        where: { status: { in: ['PENDING', 'REQUIRES_ACTION'] } },
      }),
    ])

    const count = activeProviders.length
    const avgResponseTimeHours =
      count > 0
        ? activeProviders.reduce((s, p) => s + p.responseTimeHours, 0) / count
        : 0
    const avgCompletionRate =
      count > 0
        ? activeProviders.reduce((s, p) => s + p.completionRate, 0) / count
        : 0

    health = {
      avgResponseTimeHours: Math.round(avgResponseTimeHours * 10) / 10,
      avgCompletionRate: Math.round(avgCompletionRate * 10) / 10,
      openDisputes,
      pendingKyc,
    }
  } catch (e) {
    console.error('Analytics health error:', e)
  }

  return NextResponse.json({
    monthlyRevenue,
    categoryBreakdown,
    topSuburbs,
    funnel,
    health,
  })
}
