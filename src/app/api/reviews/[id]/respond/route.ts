import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { response } = await req.json()

    if (!response || typeof response !== 'string' || response.trim().length === 0) {
      return NextResponse.json({ error: 'Response text is required' }, { status: 400 })
    }

    // Verify this review belongs to a booking where the current user is the provider
    const review = await prisma.review.findUnique({
      where: { id },
      include: { booking: { select: { providerId: true } } },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (review.booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to respond to this review' }, { status: 403 })
    }

    if (review.providerResponse) {
      return NextResponse.json({ error: 'Review already has a response' }, { status: 400 })
    }

    // Filter contact info from provider response
    let sanitizedResponse = response.trim()
    const responseFilter = filterContactInfo(sanitizedResponse)
    if (responseFilter.flagged) {
      sanitizedResponse = responseFilter.text
      // Log leakage flag
      await prisma.contactLeakageFlag.create({
        data: {
          reviewId: id,
          userId: session.user.id,
          flagType: responseFilter.flagType || 'UNKNOWN',
          snippet: responseFilter.matches.join(', '),
        },
      }).catch(() => {})
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { providerResponse: sanitizedResponse },
    })

    return NextResponse.json({ review: updated })
  } catch (error) {
    console.error('Review respond error:', error)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}
