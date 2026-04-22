import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const [completedBookings, allBookings, recentUsers, topProviderProfiles] = await Promise.all([
      prisma.booking.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: sixMonthsAgo } },
        select: { totalPrice: true, platformFee: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { status: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, role: true },
      }),
      prisma.providerProfile.findMany({
        orderBy: { totalEarnings: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true } },
          _count: { select: { services: true } },
        },
      }),
    ])

    // Build month labels for last 6 months
    const monthLabels: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthLabels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }))
    }

    const monthKeys: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    // Revenue by month (array format)
    const revMap: Record<string, number> = {}
    for (const b of completedBookings) {
      const key = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, '0')}`
      revMap[key] = (revMap[key] || 0) + b.totalPrice
    }
    const revenueByMonth = monthKeys.map((key, i) => ({
      month: monthLabels[i],
      revenue: revMap[key] || 0,
    }))

    // Bookings by status (array format)
    const statusMap: Record<string, number> = {}
    for (const b of allBookings) {
      statusMap[b.status] = (statusMap[b.status] || 0) + 1
    }
    const bookingsByStatus = ['COMPLETED', 'CONFIRMED', 'PENDING', 'CANCELLED', 'DECLINED']
      .map(status => ({ status, count: statusMap[status] || 0 }))

    // New users by month (array format)
    const userMap: Record<string, number> = {}
    for (const u of recentUsers) {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`
      userMap[key] = (userMap[key] || 0) + 1
    }
    const newUsersByMonth = monthKeys.map((key, i) => ({
      month: monthLabels[i],
      count: userMap[key] || 0,
    }))

    // Top providers (array format)
    const providerBookingCounts = await prisma.booking.groupBy({
      by: ['providerUserId'],
      _count: { id: true },
      where: { status: 'COMPLETED' },
    })
    const bookingCountMap: Record<string, number> = {}
    for (const p of providerBookingCounts) {
      bookingCountMap[p.providerUserId] = p._count?.id ?? 0
    }

    const topProviders = topProviderProfiles
      .filter(p => p.totalEarnings > 0)
      .map(p => ({
        name: p.user.name || 'Unnamed',
        earnings: p.totalEarnings,
        bookings: bookingCountMap[p.userId] || 0,
      }))

    // Drop-off stats
    const total = allBookings.length
    const completed = statusMap['COMPLETED'] || 0
    const cancelled = statusMap['CANCELLED'] || 0
    const declined = statusMap['DECLINED'] || 0
    const rate = total > 0 ? ((total - completed) / total) * 100 : 0

    return NextResponse.json({
      revenueByMonth,
      bookingsByStatus,
      topProviders,
      newUsersByMonth,
      dropOff: { total, completed, cancelled, declined, rate },
    })
  } catch (error) {
    console.error('Admin reports error:', error)
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 })
  }
}
