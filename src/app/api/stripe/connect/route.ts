import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, stripeAccountId: true },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
    }

    let stripeAccountId = profile.stripeAccountId

    // Create a new Stripe Connect Express account if one doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU',
        email: session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          sparqUserId: session.user.id,
          sparqProfileId: profile.id,
        },
      })

      stripeAccountId = account.id

      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId: account.id },
      })
    }

    // Create an Account Link for onboarding
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/api/stripe/connect/refresh`,
      return_url: `${origin}/dashboard/provider/payouts?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json({ error: 'Failed to create Stripe account' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { stripeAccountId: true },
    })

    if (!profile || !profile.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
      })
    }

    const account = await stripe.accounts.retrieve(profile.stripeAccountId)

    return NextResponse.json({
      connected: true,
      payoutsEnabled: account.payouts_enabled ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      stripeAccountId: profile.stripeAccountId,
    })
  } catch (error) {
    console.error('Stripe account status error:', error)
    return NextResponse.json({ error: 'Failed to check account status' }, { status: 500 })
  }
}
