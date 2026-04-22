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
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      users, bookings, reviews, providers,
      pendingVerifications, openDisputes, todayBookings,
      failedPayouts, pendingKYC, highRiskKYC, requiresActionKYC,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.booking.findMany({ select: { totalPrice: true, status: true } }),
      prisma.review.count({ where: { isFlagged: true } }),
      prisma.providerProfile.count(),
      prisma.verification.count({ where: { status: 'PENDING' } }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      prisma.booking.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.payout.count({ where: { status: 'FAILED' } }),
      prisma.kYCRecord.count({ where: { status: 'PENDING' } }),
      prisma.kYCRecord.count({ where: { riskLevel: 'HIGH' } }),
      prisma.kYCRecord.count({ where: { status: 'REQUIRES_ACTION' } }),
    ])

    const completedBookings = bookings.filter(b => b.status === 'COMPLETED')
    // GMV includes CONFIRMED bookings (revenue committed but not yet settled) + COMPLETED
    const gmv = bookings
      .filter(b => b.status === 'COMPLETED' || b.status === 'CONFIRMED')
      .reduce((s, b) => s + b.totalPrice, 0)

    return NextResponse.json({
      users,
      providers,
      gmv,
      totalBookings: bookings.length,
      flaggedReviews: reviews,
      pendingVerifications,
      openDisputes,
      todayBookings,
      failedPayouts,
      pendingKYC,
      highRiskKYC,
      requiresActionKYC,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
