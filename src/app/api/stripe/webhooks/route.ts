import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  switch (event.type) {
    // ─── Identity Verification Events ────────────────────────────────
    case 'identity.verification_session.verified': {
      const session = event.data.object as Stripe.Identity.VerificationSession
      const providerId = session.metadata?.provider_id
      if (providerId) {
        await prisma.verification.update({
          where: { providerId },
          data: { status: 'APPROVED', reviewedAt: new Date() },
        })
        await prisma.providerProfile.update({
          where: { id: providerId },
          data: { isVerified: true },
        })
      }
      break
    }

    case 'identity.verification_session.requires_input': {
      const session = event.data.object as Stripe.Identity.VerificationSession
      const providerId = session.metadata?.provider_id
      if (providerId) {
        await prisma.verification.update({
          where: { providerId },
          data: { status: 'REJECTED', reviewedAt: new Date() },
        })
      }
      break
    }

    case 'identity.verification_session.processing':
      // Still processing — keep as PENDING
      break

    // ─── Payment Events ──────────────────────────────────────────────
    case 'payment_intent.amount_capturable_updated': {
      // Card hold placed — mark as authorised
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (booking) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: 'AUTHORISED' },
          })
        } else {
          console.log(`Webhook: No booking found for PI ${pi.id} (amount_capturable_updated)`)
        }
      }
      break
    }

    case 'payment_intent.succeeded': {
      // Payment captured successfully
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (booking) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: 'CAPTURED' },
          })
        } else {
          console.log(`Webhook: No booking found for PI ${pi.id} (succeeded)`)
        }
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (booking && booking.status === 'PENDING') {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
          })
          await prisma.notification.create({
            data: {
              userId: booking.customerId,
              type: 'BOOKING_CANCELLED',
              title: 'Payment failed',
              message: 'Your payment authorization failed. The booking has been cancelled.',
              link: '/dashboard/customer',
            },
          })
        }
      }
      break
    }

    case 'payment_intent.canceled': {
      // PI expired (uncaptured after 7 days) or was cancelled
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (booking) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: booking.status === 'PENDING' ? 'CANCELLED' : booking.status,
              paymentStatus: 'AUTH_RELEASED',
            },
          })
          if (booking.status === 'PENDING') {
            await prisma.notification.create({
              data: {
                userId: booking.customerId,
                type: 'BOOKING_CANCELLED',
                title: 'Booking expired',
                message: 'Your booking was not accepted in time. Your card hold has been released.',
                link: '/dashboard/customer',
              },
            })
          }
        } else {
          console.log(`Webhook: No booking found for PI ${pi.id} (canceled)`)
        }
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      if (piId) {
        const booking = await prisma.booking.findFirst({ where: { stripePaymentId: piId } })
        if (booking) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              paymentStatus: 'REFUNDED',
              refundStatus: 'PROCESSED',
              refundedAt: new Date(),
            },
          })
          await prisma.notification.create({
            data: {
              userId: booking.customerId,
              type: 'BOOKING_CANCELLED',
              title: 'Refund processed',
              message: 'Your refund has been processed. It may take 5-10 business days to appear.',
              link: '/dashboard/customer',
            },
          })
        } else {
          console.log(`Webhook: No booking found for PI ${piId} (charge.refunded)`)
        }
      }
      break
    }

    // ─── Connect Account Events ────────────────────────────────────
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.id) {
        const profile = await prisma.providerProfile.findFirst({
          where: { stripeAccountId: account.id },
        })
        if (profile) {
          console.log(
            `Webhook: Connect account ${account.id} updated — ` +
            `charges_enabled: ${account.charges_enabled}, ` +
            `payouts_enabled: ${account.payouts_enabled}, ` +
            `details_submitted: ${account.details_submitted}`
          )
        } else {
          console.log(`Webhook: No provider profile found for Connect account ${account.id}`)
        }
      }
      break
    }

    default:
      // Ignore unhandled event types
      break
  }

  return NextResponse.json({ received: true })
}
