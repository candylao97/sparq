import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { refundAmount, refundReason } = body

    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json({ error: 'Valid refund amount is required' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (refundAmount > booking.totalPrice) {
      return NextResponse.json({ error: 'Refund amount cannot exceed booking total' }, { status: 400 })
    }

    // Process refund or cancellation via Stripe
    if (booking.stripePaymentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)

        if (pi.status === 'requires_capture') {
          // Auth not yet captured — just cancel it
          await stripe.paymentIntents.cancel(booking.stripePaymentId)
        } else if (pi.status === 'succeeded') {
          // Payment was captured — issue a refund
          await stripe.refunds.create({
            payment_intent: booking.stripePaymentId,
            amount: refundAmount ? Math.round(refundAmount * 100) : undefined,
          })
        }
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError)
        return NextResponse.json({ error: 'Stripe refund failed' }, { status: 500 })
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        refundStatus: 'PROCESSED',
        refundAmount,
        refundReason: refundReason || null,
        refundedAt: new Date(),
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Admin refund error:', error)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
