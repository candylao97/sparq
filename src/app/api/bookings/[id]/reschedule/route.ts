import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { date, time } = await req.json()

    // Validate inputs
    if (!date || !time) {
      return NextResponse.json({ error: 'date and time are required' }, { status: 400 })
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'time must be in HH:MM format' }, { status: 400 })
    }
    const newDate = new Date(date)
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (newDate < today) {
      return NextResponse.json({ error: 'Reschedule date cannot be in the past' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { service: true },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Only customer or provider can reschedule
    const isProvider = session.user.id === booking.providerId
    const isCustomer = session.user.id === booking.customerId
    if (!isProvider && !isCustomer) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Only PENDING or CONFIRMED bookings can be rescheduled
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot reschedule a ${booking.status.toLowerCase()} booking` },
        { status: 400 }
      )
    }

    // Handle Stripe payment if exists
    if (booking.stripePaymentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentId)
        if (pi.status === 'requires_capture') {
          // Authorized but not captured — cancel the hold
          await stripe.paymentIntents.cancel(booking.stripePaymentId)
        } else if (pi.status === 'succeeded') {
          // Already captured (CONFIRMED booking) — issue full refund
          await stripe.refunds.create({ payment_intent: booking.stripePaymentId })
        }
      } catch (stripeError) {
        console.error('Stripe cancel/refund on reschedule:', stripeError)
        // Non-blocking — hold will expire naturally
      }
    }

    // Update booking with new date/time, reset to PENDING
    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        date: newDate,
        time,
        status: 'PENDING',
        stripePaymentId: null,
        acceptDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Create new PaymentIntent for the rescheduled booking (same amount)
    let clientSecret: string | null = null
    if (booking.totalPrice > 0) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(booking.totalPrice * 100),
          currency: 'aud',
          capture_method: 'manual',
          metadata: {
            bookingId: booking.id,
            customerId: booking.customerId,
            providerId: booking.providerId,
            serviceTitle: booking.service.title,
          },
        })

        await prisma.booking.update({
          where: { id: params.id },
          data: { stripePaymentId: paymentIntent.id },
        })

        clientSecret = paymentIntent.client_secret
      } catch (stripeError) {
        console.error('Stripe PI creation on reschedule:', stripeError)
        // Booking is rescheduled but payment needs to be set up separately
      }
    }

    // Notify the other party
    const recipientId = isCustomer ? booking.providerId : booking.customerId
    const initiatorLabel = isCustomer ? 'The client' : 'The artist'
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_BOOKING',
        title: 'Booking Rescheduled',
        message: `${initiatorLabel} has rescheduled the booking for ${booking.service.title}`,
        link: isCustomer ? `/dashboard/provider` : `/dashboard/customer`,
      },
    })

    return NextResponse.json({ booking: updated, clientSecret })
  } catch (error) {
    console.error('Reschedule error:', error)
    return NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 })
  }
}
