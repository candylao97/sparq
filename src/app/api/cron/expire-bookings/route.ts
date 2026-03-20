import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        acceptDeadline: { lt: new Date() },
      },
    })

    let expired = 0
    for (const booking of expiredBookings) {
      // Cancel Stripe PaymentIntent if exists to release the hold
      if (booking.stripePaymentId) {
        try {
          await stripe.paymentIntents.cancel(booking.stripePaymentId)
        } catch {
          // PI may already be cancelled or expired — safe to ignore
        }
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'EXPIRED',
          paymentStatus: 'AUTH_RELEASED',
        },
      })

      // Notify the customer that their booking request expired
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_EXPIRED',
          title: 'Booking Request Expired',
          message: 'Your booking request was not responded to in time and has expired.',
          link: `/dashboard/customer`,
        },
      })

      expired++
    }

    return NextResponse.json({ expired })
  } catch (error) {
    console.error('Expire bookings error:', error)
    return NextResponse.json({ error: 'Failed to expire bookings' }, { status: 500 })
  }
}
