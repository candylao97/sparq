import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      isVerified: true,
      kycRecord: {
        select: {
          status: true,
          rejectedReason: true,
          adminNotes: true,
        },
      },
    },
  })

  if (!provider) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })
  }

  // If no KYC record yet, treat as PENDING
  const kycStatus = provider.isVerified
    ? 'VERIFIED'
    : (provider.kycRecord?.status ?? 'PENDING')
  const kycNotes = provider.kycRecord?.rejectedReason ?? provider.kycRecord?.adminNotes ?? null

  let stripeVerificationUrl: string | null = null

  // Create a fresh Stripe verification session for statuses that need re-submission
  if (kycStatus === 'REJECTED' || kycStatus === 'REQUIRES_ACTION') {
    try {
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
          provider_id: provider.id,
          user_id: session.user.id,
        },
        return_url: `${process.env.NEXTAUTH_URL}/dashboard/provider/kyc`,
      })
      stripeVerificationUrl = verificationSession.url ?? null
    } catch {
      // Non-critical — page still renders without a URL
      stripeVerificationUrl = null
    }
  }

  return NextResponse.json({ kycStatus, kycNotes, stripeVerificationUrl })
}
