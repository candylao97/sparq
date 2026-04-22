import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface PayoutHistoryItem {
  id: string
  bookingId: string
  amount: number
  platformFee: number
  status: string
  scheduledAt: string
  processedAt: string | null
  serviceTitle: string
  bookingDate: string
  customerName: string | null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role === 'CUSTOMER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payouts = await prisma.payout.findMany({
      where: { providerUserId: session.user.id },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
      include: {
        booking: {
          select: {
            date: true,
            service: { select: { title: true } },
            customer: { select: { name: true } },
          },
        },
      },
    })

    const items: PayoutHistoryItem[] = payouts.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      amount: p.amount,
      platformFee: p.platformFee,
      status: p.status,
      scheduledAt: p.scheduledAt.toISOString(),
      processedAt: p.processedAt ? p.processedAt.toISOString() : null,
      serviceTitle: p.booking.service.title,
      bookingDate: p.booking.date.toISOString(),
      customerName: p.booking.customer.name,
    }))

    return NextResponse.json({ payouts: items })
  } catch (error) {
    console.error('Payout history error:', error)
    return NextResponse.json({ error: 'Failed to load payout history' }, { status: 500 })
  }
}
