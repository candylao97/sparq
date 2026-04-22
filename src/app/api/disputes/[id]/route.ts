import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * P4-5: Admin dispute resolution endpoint.
 * PATCH /api/disputes/:id
 *
 * Allows admins to resolve disputes, which unblocks the payout cron.
 * - RESOLVED_REFUND  → issue Stripe refund, cancel payout
 * - RESOLVED_NO_REFUND → re-schedule payout for provider
 * - CLOSED           → close without action (e.g. invalid dispute)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { status, resolution } = await req.json()

    const ALLOWED_RESOLUTIONS = ['RESOLVED_REFUND', 'RESOLVED_NO_REFUND', 'CLOSED']
    if (!ALLOWED_RESOLUTIONS.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_RESOLUTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: params.id },
      include: {
        booking: {
          include: {
            provider: { include: { providerProfile: true } },
          },
        },
      },
    })
    if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

    if (['RESOLVED_REFUND', 'RESOLVED_NO_REFUND', 'CLOSED'].includes(dispute.status)) {
      return NextResponse.json({ error: 'Dispute is already resolved' }, { status: 400 })
    }

    const booking = dispute.booking

    // Handle resolution logic
    if (status === 'RESOLVED_REFUND') {
      // Issue full Stripe refund to customer
      if (booking.stripePaymentId) {
        try {
          await stripe.refunds.create({ payment_intent: booking.stripePaymentId })
        } catch (stripeErr) {
          console.error('Stripe refund failed during dispute resolution:', stripeErr)
          return NextResponse.json(
            { error: 'Stripe refund failed. Please try again or process manually.' },
            { status: 500 }
          )
        }
      }

      // Cancel any pending/scheduled payouts for this booking
      await prisma.payout.updateMany({
        where: { bookingId: booking.id, status: { in: ['SCHEDULED', 'PROCESSING'] } },
        data: { status: 'CANCELLED' },
      })

      // Update booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
          refundStatus: 'PROCESSED',
          refundAmount: booking.totalPrice,
          refundedAt: new Date(),
        },
      })

      // Notify customer
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_CANCELLED',
          title: 'Dispute Resolved — Refund Issued',
          message: 'Your dispute has been reviewed. A full refund has been issued to your original payment method.',
          link: '/bookings',
        },
      }).catch(() => {})

      // Notify provider
      await prisma.notification.create({
        data: {
          userId: booking.providerId,
          type: 'BOOKING_CANCELLED',
          title: 'Dispute Resolved — Refund Issued',
          message: 'A dispute on one of your bookings was resolved in favour of the customer. The payout has been cancelled.',
          link: '/dashboard/provider',
        },
      }).catch(() => {})

    } else if (status === 'RESOLVED_NO_REFUND') {
      // Re-schedule payout for provider (dispute window already cleared)
      const providerProfile = booking.provider.providerProfile
      if (providerProfile && booking.totalPrice > 0) {
        const providerPayout = booking.totalPrice - booking.platformFee
        await prisma.payout.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            providerId: providerProfile.id,
            amount: Math.max(0, providerPayout),
            platformFee: booking.platformFee,
            status: 'SCHEDULED',
            scheduledAt: new Date(), // Process immediately on next cron run
          },
          update: {
            status: 'SCHEDULED',
            scheduledAt: new Date(),
          },
        })
      }

      // Restore booking status to COMPLETED so payout cron can proceed
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' },
      })

      // Notify customer
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_COMPLETED',
          title: 'Dispute Resolved — No Refund',
          message: 'Your dispute has been reviewed. Based on the evidence provided, a refund was not issued.',
          link: '/bookings',
        },
      }).catch(() => {})

      // Notify provider
      await prisma.notification.create({
        data: {
          userId: booking.providerId,
          type: 'PAYOUT_SENT',
          title: 'Dispute Resolved — Payout Scheduled',
          message: 'A dispute on one of your bookings was resolved in your favour. Your payout will be processed shortly.',
          link: '/dashboard/provider/payouts',
        },
      }).catch(() => {})
    }
    // For CLOSED: no payment action — just close the record

    // Update dispute status
    const updated = await prisma.dispute.update({
      where: { id: params.id },
      data: {
        status,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        ...(resolution ? { resolution } : {}),
      },
    })

    // Log in booking status history
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: 'DISPUTED',
        toStatus: status === 'RESOLVED_REFUND' ? 'REFUNDED' : 'COMPLETED',
        changedBy: session.user.id,
        reason: `Dispute ${params.id} resolved by admin: ${status}`,
      },
    }).catch(() => {})

    return NextResponse.json({ dispute: updated })
  } catch (error) {
    console.error('Dispute resolution error:', error)
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      booking: {
        include: {
          service: { select: { title: true, price: true } },
          customer: { select: { id: true, name: true, email: true } },
          provider: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })
  if (!dispute) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ dispute })
}
