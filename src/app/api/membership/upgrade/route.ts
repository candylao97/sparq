import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // P1-G/P1-D: Check if the user already has an active premium membership or an active
    // Stripe subscription ID, to prevent duplicate checkout sessions.
    const existing = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
      select: { membership: true, stripeSubscriptionId: true, stripeCustomerId: true },
    })
    if (existing?.membership === 'PREMIUM') {
      return NextResponse.json({ error: 'You already have an active Sparq Premium membership.' }, { status: 400 })
    }
    // P1-D: Block duplicate checkout if a Stripe subscription ID is already stored
    // (covers the case where the Stripe webhook has fired but membership hasn't updated yet).
    if (existing?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'You already have an active membership.' }, { status: 400 })
    }
    // P1-D: Guard against duplicate pending checkout sessions — search Stripe for any open
    // checkout sessions for this customer created in the last 10 minutes. This prevents
    // double-clicks or rapid resubmissions from creating two concurrent Stripe checkout sessions.
    if (existing?.stripeCustomerId) {
      const tenMinutesAgo = Math.floor((Date.now() - 10 * 60 * 1000) / 1000)
      const recentSessions = await stripe.checkout.sessions.list({
        customer: existing.stripeCustomerId,
        limit: 5,
      })
      const hasPendingSession = recentSessions.data.some(
        s => s.status === 'open' &&
          s.metadata?.type === 'premium_membership' &&
          s.created > tenMinutesAgo
      )
      if (hasPendingSession) {
        return NextResponse.json(
          { error: 'A checkout session is already in progress. Please complete it or wait a moment before trying again.' },
          { status: 400 }
        )
      }
    }

    const priceConfig = process.env.STRIPE_PRICE_PREMIUM
      ? { price: process.env.STRIPE_PRICE_PREMIUM }
      : {
          price_data: {
            currency: 'aud',
            unit_amount: 1499, // $14.99/month
            recurring: { interval: 'month' as const },
            product_data: {
              name: 'Sparq Premium',
              description: 'Zero booking fees + priority support + exclusive artist access',
            },
          },
        }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ ...priceConfig, quantity: 1 }],
      metadata: {
        type: 'premium_membership',
        userId: session.user.id,
      },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/customer?premium=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/customer?premium=cancelled`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[membership/upgrade] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
