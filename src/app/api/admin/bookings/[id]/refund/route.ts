import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { sendRefundConfirmationEmail } from '@/lib/email'

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

    // Cancel any scheduled/processing payout to prevent double-payment
    await prisma.payout.updateMany({
      where: {
        bookingId: params.id,
        status: { in: ['SCHEDULED', 'PROCESSING'] },
      },
      data: { status: 'CANCELLED' },
    })

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

    // Notify customer of refund
    await prisma.notification.create({
      data: {
        userId: updatedBooking.customer.id,
        type: 'REFUND_PROCESSED',
        title: 'Refund Processed',
        message: `A refund of $${refundAmount.toFixed(2)} for your ${updatedBooking.service.title} booking has been processed and should appear within 5–10 business days.`,
        link: '/dashboard/customer',
      },
    }).catch(() => {})

    // Send refund confirmation email (non-blocking)
    if (updatedBooking.customer?.email) {
      sendRefundConfirmationEmail(updatedBooking.customer.email, {
        name: updatedBooking.customer.name ?? 'there',
        serviceTitle: updatedBooking.service.title,
        amount: refundAmount,
        reason: refundReason,
      }).catch(err => console.error('Refund confirmation email error:', err))
    }

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Admin refund error:', error)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
