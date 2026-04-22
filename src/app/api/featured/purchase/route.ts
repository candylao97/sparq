import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Price options for featured listings
const FEATURED_PLANS = {
  '7days': { days: 7, priceAud: 2900, label: '7-day featured listing' },   // $29
  '30days': { days: 30, priceAud: 7900, label: '30-day featured listing' }, // $79
  '90days': { days: 90, priceAud: 19900, label: '90-day featured listing' }, // $199
} as const

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !['PROVIDER', 'BOTH'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { plan } = await req.json() as { plan: keyof typeof FEATURED_PLANS }
    const selectedPlan = FEATURED_PLANS[plan]
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const profile = await prisma.providerProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true, stripeAccountId: true, isFeatured: true, featuredUntil: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
    }

    // Re-fetch to prevent double-purchase race
    const existingProfile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { isFeatured: true, featuredUntil: true },
    })
    if (existingProfile?.isFeatured && existingProfile.featuredUntil && existingProfile.featuredUntil > new Date()) {
      return NextResponse.json(
        { error: 'You already have an active featured listing.' },
        { status: 409 }
      )
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            unit_amount: selectedPlan.priceAud,
            product_data: {
              name: selectedPlan.label,
              description: `Your profile will appear as Featured at the top of search results for ${selectedPlan.days} days.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'featured_listing',
        providerId: session.user.id,
        profileId: profile.id,
        durationDays: String(selectedPlan.days),
      },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/provider?featured=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/provider/settings?featured=cancelled`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[featured/purchase] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
