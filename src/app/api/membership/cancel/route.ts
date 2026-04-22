import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerProfile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { membership: true, stripeSubscriptionId: true },
  })

  if (customerProfile?.membership !== 'PREMIUM') {
    return NextResponse.json({ error: 'No active premium membership.' }, { status: 400 })
  }

  // Cancel Stripe subscription at period end — user keeps benefits until billing cycle ends
  let stripeError: string | null = null
  if (customerProfile.stripeSubscriptionId) {
    try {
      // Cancel at period end — user keeps benefits until their billing cycle ends
      await stripe.subscriptions.update(customerProfile.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })
    } catch (err) {
      stripeError = String(err)
      console.error('[MEMBERSHIP_CANCEL_STRIPE]', err)
      // Continue to update DB even if Stripe update fails — manual reconciliation needed
    }
  } else {
    console.warn('[MEMBERSHIP_CANCEL] No stripeSubscriptionId found for user', session.user.id)
  }

  // Keep membership as PREMIUM in DB until the Stripe webhook fires customer.subscription.deleted.
  // Do NOT mutate stripeSubscriptionId — keep the real Stripe sub ID so future API calls work.
  // The webhook (customer.subscription.deleted) will clear the membership when the period ends.
  await prisma.customerProfile.update({
    where: { userId: session.user.id },
    data: {
      // Keep PREMIUM so user retains benefits until billing period ends
      membership: 'PREMIUM',
      // stripeSubscriptionId is intentionally left unchanged — the real sub ID must remain
      // intact so the webhook handler can match it when the subscription is deleted.
    },
  })

  // P1-D: Unset free membership-based featured status.
  // Paid featured listings have featuredUntil set — those are left untouched.
  await prisma.providerProfile.updateMany({
    where: {
      userId: session.user.id,
      isFeatured: true,
      featuredUntil: null,
    },
    data: { isFeatured: false },
  }).catch(() => {})

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: 'BOOKING_CANCELLED',
      title: 'Premium membership cancelled',
      message: stripeError
        ? 'Your membership cancellation has been requested. Note: there may be a delay — contact support if you continue to be charged after your billing period ends.'
        : 'Your Sparq Premium membership will end at the end of your current billing period. You\'ll keep your benefits until then.',
    },
  }).catch(() => {})

  return NextResponse.json({
    cancelled: true,
    stripeError: stripeError ?? null,
  })
}
