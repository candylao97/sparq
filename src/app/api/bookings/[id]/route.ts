import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { status } = await req.json()

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        service: { include: { provider: true } },
        provider: { include: { providerProfile: true } },
      },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const isProvider = session.user.id === booking.providerId
    const isCustomer = session.user.id === booking.customerId
    const isAdmin = session.user.role === 'ADMIN'
    if (!isProvider && !isCustomer && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Authorization: who can set which status
    const CUSTOMER_STATUSES = ['CANCELLED_BY_CUSTOMER']
    const PROVIDER_STATUSES = ['CONFIRMED', 'DECLINED', 'CANCELLED_BY_PROVIDER', 'COMPLETED']

    if (isCustomer && !isAdmin && !CUSTOMER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Customers can only cancel their own bookings' }, { status: 403 })
    }
    if (isProvider && !isAdmin && !PROVIDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status for provider' }, { status: 403 })
    }

    // Validate state transitions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'DECLINED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'EXPIRED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'DISPUTED'],
      COMPLETED: ['REFUNDED', 'DISPUTED'],
      CANCELLED: [],
      CANCELLED_BY_CUSTOMER: [],
      CANCELLED_BY_PROVIDER: [],
      DECLINED: [],
      EXPIRED: [],
      REFUNDED: [],
      DISPUTED: ['REFUNDED', 'COMPLETED'],
    }
    const allowed = VALID_TRANSITIONS[booking.status] || []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${booking.status} to ${status}` },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = { status }

    // Handle Stripe payment based on status change
    if (booking.stripePaymentId) {
      try {
        switch (status) {
          case 'CONFIRMED': {
            // Capture the authorized payment
            await stripe.paymentIntents.capture(booking.stripePaymentId)
            updateData.paymentStatus = 'CAPTURED'
            break
          }
          case 'DECLINED':
          case 'EXPIRED': {
            // Cancel PI to release the hold
            try {
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
            } catch { /* PI may already be cancelled */ }
            updateData.paymentStatus = 'AUTH_RELEASED'
            break
          }
          case 'CANCELLED_BY_CUSTOMER': {
            const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)
            if (pi.status === 'requires_capture') {
              // PENDING state — just release the hold
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
              updateData.paymentStatus = 'AUTH_RELEASED'
            } else if (pi.status === 'succeeded') {
              // CONFIRMED state — refund the captured payment
              await stripe.refunds.create({ payment_intent: booking.stripePaymentId })
              updateData.paymentStatus = 'REFUNDED'
              updateData.refundStatus = 'PROCESSED'
              updateData.refundAmount = booking.totalPrice
              updateData.refundedAt = new Date()
            }
            break
          }
          case 'CANCELLED_BY_PROVIDER': {
            const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)
            if (pi.status === 'requires_capture') {
              await stripe.paymentIntents.cancel(booking.stripePaymentId)
              updateData.paymentStatus = 'AUTH_RELEASED'
            } else if (pi.status === 'succeeded') {
              await stripe.refunds.create({ payment_intent: booking.stripePaymentId })
              updateData.paymentStatus = 'REFUNDED'
              updateData.refundStatus = 'PROCESSED'
              updateData.refundAmount = booking.totalPrice
              updateData.refundedAt = new Date()
            }
            break
          }
          case 'COMPLETED': {
            updateData.completedAt = new Date()
            updateData.disputeDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
            // Payout will be processed automatically after dispute window
            // Don't transfer immediately — schedule it
            const providerProfile = booking.provider.providerProfile
            if (providerProfile && booking.totalPrice > 0) {
              const providerPayout = booking.totalPrice - booking.platformFee
              try {
                await prisma.payout.create({
                  data: {
                    bookingId: booking.id,
                    providerId: providerProfile.id,
                    amount: providerPayout,
                    platformFee: booking.platformFee,
                    status: 'SCHEDULED',
                    scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                  },
                })
              } catch (payoutError) {
                console.error('Failed to schedule payout:', payoutError)
              }
            }
            break
          }
          case 'REFUNDED': {
            await stripe.refunds.create({ payment_intent: booking.stripePaymentId })
            updateData.paymentStatus = 'REFUNDED'
            updateData.refundStatus = 'PROCESSED'
            updateData.refundAmount = booking.totalPrice
            updateData.refundedAt = new Date()
            break
          }
        }
      } catch (stripeError) {
        // For CONFIRMED, this is critical — block the transition
        if (status === 'CONFIRMED') {
          console.error('Stripe capture failed:', stripeError)
          return NextResponse.json(
            { error: 'Failed to capture payment. The card authorization may have expired.' },
            { status: 400 }
          )
        }
        // For other statuses, log but don't block
        console.error('Stripe payment handling error:', stripeError)
      }
    } else if (status === 'COMPLETED') {
      // Handle $0 bookings (voucher-covered) — still set dispute window
      updateData.completedAt = new Date()
      updateData.disputeDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const providerProfile = booking.provider.providerProfile
      if (providerProfile && booking.totalPrice > 0) {
        const providerPayout = booking.totalPrice - booking.platformFee
        try {
          await prisma.payout.create({
            data: {
              bookingId: booking.id,
              providerId: providerProfile.id,
              amount: providerPayout,
              platformFee: booking.platformFee,
              status: 'SCHEDULED',
              scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            },
          })
        } catch (payoutError) {
          console.error('Failed to schedule payout:', payoutError)
        }
      }
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
    })

    // Log status change
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: params.id,
        fromStatus: booking.status,
        toStatus: status,
        changedBy: session.user.id,
      },
    }).catch(() => {}) // Non-blocking

    // Build notification
    const NOTIF_MAP: Record<string, { type: string; title: string; message: string }> = {
      CONFIRMED: {
        type: 'BOOKING_ACCEPTED',
        title: 'Booking Confirmed',
        message: `Your booking for ${booking.service.title} has been accepted and your card has been charged.`,
      },
      DECLINED: {
        type: 'BOOKING_DECLINED',
        title: 'Booking Declined',
        message: `Your booking for ${booking.service.title} was declined. Your card hold has been released.`,
      },
      CANCELLED_BY_CUSTOMER: {
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled by Customer',
        message: `The customer cancelled the booking for ${booking.service.title}.`,
      },
      CANCELLED_BY_PROVIDER: {
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled by Artist',
        message: `Your booking for ${booking.service.title} has been cancelled by the artist.`,
      },
      COMPLETED: {
        type: 'BOOKING_COMPLETED',
        title: 'Booking Completed',
        message: `Your booking for ${booking.service.title} has been marked as completed.`,
      },
      EXPIRED: {
        type: 'BOOKING_EXPIRED',
        title: 'Booking Expired',
        message: `Your booking request for ${booking.service.title} has expired.`,
      },
      REFUNDED: {
        type: 'BOOKING_CANCELLED',
        title: 'Booking Refunded',
        message: `Your booking for ${booking.service.title} has been refunded.`,
      },
      DISPUTED: {
        type: 'BOOKING_DISPUTED',
        title: 'Booking Disputed',
        message: `A dispute has been opened for your booking for ${booking.service.title}.`,
      },
    }

    const notif = NOTIF_MAP[status]
    if (notif) {
      // Notify the other party (customer for provider actions, provider for customer actions)
      const notifyUserId = isCustomer ? booking.providerId : booking.customerId
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: notif.type as never,
          title: notif.title,
          message: notif.message,
          link: isCustomer ? `/dashboard/provider` : `/dashboard/customer`,
        },
      })
    }

    return NextResponse.json({ booking: updated })
  } catch (error) {
    console.error('Booking update error:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      service: true,
      customer: { select: { id: true, name: true, image: true } },
      provider: { select: { id: true, name: true, image: true } },
      review: true,
      messages: { include: { sender: { select: { id: true, name: true, image: true } } } },
    },
  })

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only allow the customer or provider of this booking to view it
  if (booking.customerId !== session.user.id && booking.providerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Strip address for bookings that aren't confirmed or completed (privacy)
  const sanitizedBooking = {
    ...booking,
    address: ['CONFIRMED', 'COMPLETED'].includes(booking.status) ? booking.address : null,
  }

  return NextResponse.json({ booking: sanitizedBooking })
}
