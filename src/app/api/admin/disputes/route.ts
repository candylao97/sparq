import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const disputes = await prisma.dispute.findMany({
    include: {
      booking: {
        include: {
          customer: { select: { id: true, name: true, email: true, image: true } },
          provider: { select: { id: true, name: true, email: true, image: true } },
          service: { select: { title: true, price: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ disputes })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { disputeId, status, resolution } = await req.json()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { booking: true },
    })

    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {
      status,
      resolution: resolution || null,
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
    }

    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: updateData,
    })

    // Handle resolution outcomes
    if (status === 'RESOLVED_REFUND') {
      // Check if payout was already sent — cannot refund after transfer
      const existingPayout = await prisma.payout.findFirst({
        where: { bookingId: dispute.bookingId },
      })
      if (existingPayout && existingPayout.status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'Cannot refund — payout already transferred to provider. Recover funds manually via Stripe Dashboard.' },
          { status: 409 }
        )
      }

      // Cancel any scheduled/processing payout
      if (existingPayout && ['SCHEDULED', 'PROCESSING'].includes(existingPayout.status)) {
        await prisma.payout.update({
          where: { id: existingPayout.id },
          data: { status: 'CANCELLED' },
        })
      }

      // Refund the customer
      if (dispute.booking.stripePaymentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(dispute.booking.stripePaymentId)
          if (pi.status === 'succeeded') {
            await stripe.refunds.create({ payment_intent: dispute.booking.stripePaymentId })
          }
        } catch (e) {
          console.error('Dispute refund failed:', e)
        }
      }
      await prisma.booking.update({
        where: { id: dispute.bookingId },
        data: { status: 'REFUNDED', paymentStatus: 'REFUNDED', refundStatus: 'PROCESSED', refundAmount: dispute.booking.totalPrice, refundedAt: new Date() },
      })
    } else if (status === 'RESOLVED_NO_REFUND' || status === 'CLOSED') {
      // Re-schedule payout if it was cancelled
      const existingPayout = await prisma.payout.findFirst({
        where: { bookingId: dispute.bookingId },
      })
      if (existingPayout && existingPayout.status === 'CANCELLED') {
        await prisma.payout.update({
          where: { id: existingPayout.id },
          data: { status: 'SCHEDULED', scheduledAt: new Date() },
        })
      }
      // Reset booking to COMPLETED
      await prisma.booking.update({
        where: { id: dispute.bookingId },
        data: { status: 'COMPLETED' },
      })
    }

    // Log status change
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: dispute.bookingId,
        fromStatus: 'DISPUTED',
        toStatus: status === 'RESOLVED_REFUND' ? 'REFUNDED' : 'COMPLETED',
        changedBy: session.user.id,
        reason: `Dispute resolved: ${status}`,
      },
    }).catch(() => {})

    return NextResponse.json({ dispute: updatedDispute })
  } catch (error) {
    console.error('Dispute resolution error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
