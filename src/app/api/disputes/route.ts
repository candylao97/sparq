import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bookingId, reason, evidence } = await req.json()

    if (!bookingId || !reason?.trim()) {
      return NextResponse.json({ error: 'bookingId and reason are required' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { dispute: true },
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Only the customer can open a dispute' }, { status: 403 })
    }
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Can only dispute completed bookings' }, { status: 400 })
    }
    if (booking.dispute) {
      return NextResponse.json({ error: 'A dispute already exists for this booking' }, { status: 400 })
    }

    // Check dispute window (48 hours from completion)
    if (booking.disputeDeadline && new Date() > booking.disputeDeadline) {
      return NextResponse.json({ error: 'Dispute window has expired' }, { status: 400 })
    }

    const dispute = await prisma.dispute.create({
      data: {
        bookingId,
        customerId: session.user.id,
        reason: reason.trim(),
        evidence: evidence?.trim() || null,
      },
    })

    // Update booking status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'DISPUTED' },
    })

    // Cancel scheduled payout if exists
    await prisma.payout.updateMany({
      where: { bookingId, status: 'SCHEDULED' },
      data: { status: 'CANCELLED' },
    })

    // Log status change
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: 'COMPLETED',
        toStatus: 'DISPUTED',
        changedBy: session.user.id,
        reason: `Dispute opened: ${reason.trim().substring(0, 100)}`,
      },
    })

    // Notify provider
    await prisma.notification.create({
      data: {
        userId: booking.providerId,
        type: 'BOOKING_DISPUTED',
        title: 'Booking Disputed',
        message: 'A customer has opened a dispute for a completed booking.',
        link: '/dashboard/provider',
      },
    })

    return NextResponse.json({ dispute })
  } catch (error) {
    console.error('Dispute creation error:', error)
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('bookingId')

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.customerId !== session.user.id && booking.providerId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const dispute = await prisma.dispute.findUnique({ where: { bookingId } })
  return NextResponse.json({ dispute })
}
