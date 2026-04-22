import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!providerProfile) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Fetch all penalty payout records for this provider
  const penalties = await prisma.payout.findMany({
    where: {
      providerId: providerProfile.id,
      amount: { lt: 0 },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      booking: {
        select: {
          id: true,
          date: true,
          service: { select: { title: true } },
        },
      },
    },
  })

  const result = penalties.map(p => {
    // Determine if expired
    const isExpiredByDate = p.penaltyExpiresAt
      ? p.penaltyExpiresAt <= new Date()
      : p.createdAt <= ninetyDaysAgo
    const isExpired = p.status === 'CANCELLED' || (p.status === 'SCHEDULED' && isExpiredByDate)
    const expiresAt = p.penaltyExpiresAt ?? new Date(p.createdAt.getTime() + 90 * 24 * 60 * 60 * 1000)

    return {
      id: p.id,
      amount: Math.abs(p.amount),
      status: isExpired ? 'EXPIRED' : p.status,
      createdAt: p.createdAt,
      expiresAt,
      bookingId: p.bookingId,
      serviceTitle: p.booking?.service?.title ?? null,
      bookingDate: p.booking?.date ?? null,
    }
  })

  return NextResponse.json({ penalties: result })
}
