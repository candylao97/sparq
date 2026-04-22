import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

// Stripe Price IDs — these would be created in your Stripe dashboard
// For now we use environment variables so they can be configured
const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRICE_PRO,
  ELITE: process.env.STRIPE_PRICE_ELITE,
}

// GET — return current subscription status
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      subscriptionPlan: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
      stripeAccountId: true,
    },
  })

  if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

  return NextResponse.json({ subscription: profile })
}

// POST — create checkout session for plan upgrade
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { plan } = await req.json()
    if (!['PRO', 'ELITE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId = PLAN_PRICE_IDS[plan]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Subscription billing is not yet configured. Please contact support to upgrade.' },
        { status: 503 }
      )
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: { select: { email: true, name: true } } },
    })

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Get or create Stripe customer
    let customerId: string | undefined
    const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id } })
    if (customer?.stripeCustomerId) {
      customerId = customer.stripeCustomerId
    } else {
      const stripeCustomer = await stripe.customers.create({
        email: profile.user.email ?? undefined,
        name: profile.user.name ?? undefined,
        metadata: { userId: session.user.id },
      })
      customerId = stripeCustomer.id
      await prisma.customerProfile.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/provider/billing?success=1&plan=${plan}`,
      cancel_url: `${origin}/dashboard/provider/billing?cancelled=1`,
      metadata: { userId: session.user.id, plan },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[subscriptions] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — cancel subscription
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeSubscriptionId: true },
  })

  if (!profile?.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  // Cancel at period end (not immediately)
  await stripe.subscriptions.update(profile.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  await prisma.providerProfile.update({
    where: { userId: session.user.id },
    data: { stripeSubscriptionStatus: 'canceling' },
  })

  return NextResponse.json({ message: 'Subscription will be cancelled at the end of the billing period.' })
}
