import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { stripeAccountId: true },
    })

    if (!profile?.stripeAccountId) {
      const payoutsUrl = new URL('/dashboard/provider/payouts', req.url)
      return NextResponse.redirect(payoutsUrl)
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const accountLink = await stripe.accountLinks.create({
      account: profile.stripeAccountId,
      refresh_url: `${origin}/api/stripe/connect/refresh`,
      return_url: `${origin}/dashboard/provider/payouts?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.redirect(accountLink.url)
  } catch (error) {
    console.error('Stripe Connect refresh error:', error)
    const payoutsUrl = new URL('/dashboard/provider/payouts?error=true', req.url)
    return NextResponse.redirect(payoutsUrl)
  }
}
