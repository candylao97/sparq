import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !['PROVIDER', 'BOTH'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerId = session.user.id
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000)

  const [
    bookingsByWeek,
    revenueByService,
    repeatCustomers,
    currentMonthRevenue,
    lastMonthRevenue,
  ] = await Promise.all([
    // Weekly booking trend (last 8 weeks)
    prisma.$queryRaw<{ week: string; count: bigint; revenue: number }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('week', b.date AT TIME ZONE 'Australia/Sydney'), 'YYYY-MM-DD') as week,
        COUNT(*)::bigint as count,
        COALESCE(SUM(b."totalPrice"), 0)::float as revenue
      FROM "Booking" b
      WHERE b."providerUserId" = ${providerId}
        AND b.status = 'COMPLETED'
        AND b.date >= NOW() - INTERVAL '8 weeks'
      GROUP BY week
      ORDER BY week ASC
    `,
    // Revenue by service
    prisma.$queryRaw<{ serviceName: string; totalRevenue: number; bookingCount: bigint }[]>`
      SELECT
        s.title as "serviceName",
        COALESCE(SUM(b."totalPrice"), 0)::float as "totalRevenue",
        COUNT(b.id)::bigint as "bookingCount"
      FROM "Booking" b
      JOIN "Service" s ON s.id = b."serviceId"
      WHERE b."providerUserId" = ${providerId}
        AND b.status = 'COMPLETED'
        AND b.date >= ${thirtyDaysAgo}
      GROUP BY s.id, s.title
      ORDER BY "totalRevenue" DESC
      LIMIT 5
    `,
    // Repeat customer rate
    prisma.$queryRaw<{ repeatCount: bigint; totalCount: bigint }[]>`
      SELECT
        COUNT(DISTINCT CASE WHEN cnt > 1 THEN customer_id END)::bigint as "repeatCount",
        COUNT(DISTINCT customer_id)::bigint as "totalCount"
      FROM (
        SELECT "customerId" as customer_id, COUNT(*) as cnt
        FROM "Booking"
        WHERE "providerUserId" = ${providerId} AND status = 'COMPLETED'
        GROUP BY "customerId"
      ) t
    `,
    // Current month revenue
    prisma.booking.aggregate({
      where: {
        providerUserId: providerId,
        status: 'COMPLETED',
        date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { totalPrice: true },
    }),
    // Last month revenue
    prisma.booking.aggregate({
      where: {
        providerUserId: providerId,
        status: 'COMPLETED',
        date: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
      _sum: { totalPrice: true },
    }),
  ])

  const repeatRate = repeatCustomers[0]
    ? Number(repeatCustomers[0].totalCount) > 0
      ? Math.round((Number(repeatCustomers[0].repeatCount) / Number(repeatCustomers[0].totalCount)) * 100)
      : 0
    : 0

  return NextResponse.json({
    bookingsByWeek: bookingsByWeek.map(r => ({
      week: r.week,
      count: Number(r.count),
      revenue: r.revenue,
    })),
    revenueByService: revenueByService.map(r => ({
      ...r,
      bookingCount: Number(r.bookingCount),
    })),
    repeatCustomerRate: repeatRate,
    currentMonthRevenue: currentMonthRevenue._sum.totalPrice ?? 0,
    lastMonthRevenue: lastMonthRevenue._sum.totalPrice ?? 0,
    revenueGrowth:
      (lastMonthRevenue._sum.totalPrice ?? 0) > 0
        ? Math.round(
            (((currentMonthRevenue._sum.totalPrice ?? 0) - (lastMonthRevenue._sum.totalPrice ?? 0)) /
              (lastMonthRevenue._sum.totalPrice ?? 0)) *
              100
          )
        : null,
  })
}
