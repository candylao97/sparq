import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { sendPaymentExpiryWarningEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    // Stripe manual captures expire at 7 days. We warn at day 5 (48h before expiry).
    const day5Threshold = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    const day7Threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // ── 1. Warn: CONFIRMED bookings where auth is 5–7 days old and not yet warned ──
    const toWarn = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        paymentStatus: 'AUTHORISED',
        stripePaymentId: { not: null },
        paymentExpiryWarnedAt: null,
        createdAt: { lte: day5Threshold, gt: day7Threshold },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        service: { select: { title: true } },
      },
    })

    let warned = 0
    for (const booking of toWarn) {
      if (!booking.customer?.email) continue
      try {
        await sendPaymentExpiryWarningEmail(booking.customer.email, {
          name: booking.customer.name ?? 'there',
          serviceTitle: booking.service.title,
          bookingId: booking.id,
        })
        await prisma.booking.update({
          where: { id: booking.id },
          data: { paymentExpiryWarnedAt: now },
        })
        warned++
      } catch (err) {
        console.error(`Warning email failed for booking ${booking.id}:`, err)
      }
    }

    // ── 2. Expire: CONFIRMED bookings where auth is >7 days old ──
    const toExpire = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        paymentStatus: 'AUTHORISED',
        stripePaymentId: { not: null },
        createdAt: { lte: day7Threshold },
      },
      include: {
        customer: { select: { id: true, name: true } },
        service: { select: { title: true } },
      },
    })

    let expired = 0
    for (const booking of toExpire) {
      try {
        // Cancel the expired PaymentIntent on Stripe (it's already void, but clean up metadata)
        if (booking.stripePaymentId) {
          try {
            await stripe.paymentIntents.cancel(booking.stripePaymentId)
          } catch {
            // Already cancelled or expired on Stripe side — safe to ignore
          }
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED', paymentStatus: 'AUTH_RELEASED' },
        })

        // Notify customer to rebook
        await prisma.notification.create({
          data: {
            userId: booking.customerId,
            type: 'BOOKING_EXPIRED',
            title: 'Booking payment expired',
            message: `Your payment hold for ${booking.service.title} has expired. Please rebook to secure your appointment.`,
            link: '/search',
          },
        }).catch(() => {})

        expired++
      } catch (err) {
        console.error(`Payment expiry failed for booking ${booking.id}:`, err)
      }
    }

    return NextResponse.json({ warned, expired, total: toWarn.length + toExpire.length })
  } catch (error) {
    console.error('Expire payments cron error:', error)
    return NextResponse.json({ error: 'Failed to expire payments' }, { status: 500 })
  }
}
