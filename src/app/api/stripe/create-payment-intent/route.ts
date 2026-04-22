import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bookingId } = await req.json()
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Only the booking's customer can create a payment intent
    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check if booking already has a usable PaymentIntent
    if (booking.stripePaymentId) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(booking.stripePaymentId)
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPI.status)) {
          return NextResponse.json({ clientSecret: existingPI.client_secret })
        }
      } catch {
        // Existing PI invalid — create new one below
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100),
      currency: 'aud',
      capture_method: 'manual',
      metadata: {
        bookingId,
        customerId: session.user.id,
        providerUserId: booking.providerUserId,
        serviceTitle: booking.service.title,
      },
    })

    await prisma.booking.update({
      where: { id: bookingId },
      data: { stripePaymentId: paymentIntent.id },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error('Stripe PaymentIntent error:', error)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}
