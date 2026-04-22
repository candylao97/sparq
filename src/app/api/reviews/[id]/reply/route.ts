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
    if (response.trim().length > 500) {
      return NextResponse.json({ error: 'Response must be 500 characters or fewer' }, { status: 400 })
    }

    // Verify this review belongs to a booking where the current user is the provider
    const review = await prisma.review.findUnique({
      where: { id },
      include: { booking: { select: { providerId: true, customerId: true } } },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (review.booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to reply to this review' }, { status: 403 })
    }

    if (review.providerResponse) {
      return NextResponse.json({ error: 'Review already has a response' }, { status: 400 })
    }

    // T&S-7: Filter contact info from provider response — block submissions containing
    // contact info to prevent off-platform solicitation via review replies
    const sanitizedResponse = response.trim()
    const responseFilter = filterContactInfo(sanitizedResponse)
    if (responseFilter.flagged) {
      // Log for audit trail (non-blocking)
      await prisma.contactLeakageFlag.create({
        data: {
          reviewId: id,
          userId: session.user.id,
          flagType: responseFilter.flagType || 'UNKNOWN',
          snippet: responseFilter.matches.join(', '),
        },
      }).catch(() => {})
      return NextResponse.json({
        error: 'Your reply contains contact information. Please remove phone numbers, emails, or social handles and try again.',
      }, { status: 400 })
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { providerResponse: sanitizedResponse },
    })

    // M11: Notify the customer that the artist replied to their review
    await prisma.notification.create({
      data: {
        userId: review.booking.customerId,
        type: 'REVIEW_REPLY',
        title: 'Your review got a reply',
        message: `${session.user.name ?? 'The artist'} replied to your review.`,
        link: '/bookings',
      },
    }).catch(() => {})

    return NextResponse.json({ review: updated })
  } catch (error) {
    console.error('Review reply error:', error)
    return NextResponse.json({ error: 'Failed to submit reply' }, { status: 500 })
  }
}
