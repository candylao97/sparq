import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'
import { sendReviewReplyEmail } from '@/lib/email'

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
      include: {
        booking: {
          select: {
            providerId: true,
            service: { select: { title: true } },
            provider: { select: { name: true } },
          },
        },
        customer: { select: { id: true, name: true, email: true } },
      },
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

    // T&S: Reject provider responses containing contact info to prevent off-platform solicitation
    const responseFilter = filterContactInfo(response.trim())
    if (responseFilter.flagged) {
      // Log leakage attempt for admin review (non-blocking)
      await prisma.contactLeakageFlag.create({
        data: {
          reviewId: id,
          userId: session.user.id,
          flagType: responseFilter.flagType || 'UNKNOWN',
          snippet: responseFilter.matches.join(', '),
        },
      }).catch(() => {})
      return NextResponse.json(
        { error: 'Your response contains contact details. Please keep communication within the platform.' },
        { status: 422 }
      )
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { providerResponse: response.trim() },
    })

    // Notify customer their review received a response
    const artistName = review.booking?.provider?.name ?? 'Your artist'
    const serviceName = review.booking?.service?.title ?? null
    const providerId = review.booking.providerId

    await prisma.notification.create({
      data: {
        userId: review.customerId,
        type: 'GENERAL',
        title: `${artistName} responded to your review`,
        message: `Your review of ${serviceName ?? 'a service'} received a response. Tap to read it.`,
        link: `/providers/${providerId}#reviews`,
      },
    }).catch(() => {})

    // Email the customer
    if (review.customer?.email) {
      sendReviewReplyEmail(
        review.customer.email,
        review.customer.name ?? 'there',
        artistName,
        review.text ?? '',
        response.trim(),
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/providers/${providerId}#reviews`,
      ).catch(() => {})
    }

    return NextResponse.json({ review: updated })
  } catch (error) {
    console.error('Review respond error:', error)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}
