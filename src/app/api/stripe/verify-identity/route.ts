import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: { verification: true },
  })

  if (!provider) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
  }

  // If already verified, return early
  if (provider.isVerified) {
    return NextResponse.json({ error: 'Already verified' }, { status: 400 })
  }

  // Create a Stripe Identity VerificationSession
  const verificationSession = await stripe.identity.verificationSessions.create({
    type: 'document',
    options: {
      document: {
        allowed_types: ['driving_license', 'passport'],
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    metadata: {
      provider_id: session.user.id,  // Store userId so webhook lookup-by-userId is always correct
      user_id: session.user.id,
    },
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/provider?verified=1`,
  })

  // Upsert the Verification record — store only the session ID, never raw docs
  await prisma.verification.upsert({
    where: { providerId: provider.id },
    update: {
      stripeVerificationSessionId: verificationSession.id,
      status: 'PENDING',
      submittedAt: new Date(),
      reviewedAt: null,
    },
    create: {
      providerId: provider.id,
      stripeVerificationSessionId: verificationSession.id,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ url: verificationSession.url })
}
