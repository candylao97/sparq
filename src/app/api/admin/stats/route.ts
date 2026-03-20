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
    const [users, bookings, reviews, providers] = await Promise.all([
      prisma.user.count(),
      prisma.booking.findMany({ select: { totalPrice: true, status: true } }),
      prisma.review.count({ where: { isFlagged: true } }),
      prisma.providerProfile.count(),
    ])

    const gmv = bookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + b.totalPrice, 0)
    const pendingVerifications = await prisma.verification.count({ where: { status: 'PENDING' } })

    return NextResponse.json({
      users,
      providers,
      gmv,
      totalBookings: bookings.length,
      flaggedReviews: reviews,
      pendingVerifications,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
