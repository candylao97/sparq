import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'
import { rateLimit } from '@/lib/rate-limit' // used for per-booking rate limit and P1-5 AI generation lock
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bookingId, rating, text } = await req.json()

    // TS-3: Per-booking rate limit instead of per-user to allow reviewing multiple bookings
    const rateLimitAllowed = await rateLimit(`review:${session.user.id}:${bookingId}`, 2, 3600)
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: 'Too many review submissions. Please wait.' },
        { status: 429 }
      )
    }

    // Validate rating is an integer between 1 and 5
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 })
    }

    // TS-4: Max length on review text
    if (text && text.length > 2000) {
      return NextResponse.json({ error: 'Review must be 2000 characters or less' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    })

    if (!booking || booking.customerId !== session.user.id || booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Invalid booking' }, { status: 400 })
    }

    // T&S-3: Block self-reviews — providers cannot review their own services
    if (booking.providerId === session.user.id) {
      return NextResponse.json({ error: 'You cannot review your own service' }, { status: 403 })
    }

    // P0-2/UX-H2: completedAt must be set AND must be in the past.
    // Guards against reviews on manually-completed future bookings.
    if (!booking.completedAt || booking.completedAt > new Date()) {
      return NextResponse.json({ error: 'This booking is not yet complete' }, { status: 400 })
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    if (booking.completedAt < thirtyDaysAgo) {
      return NextResponse.json({ error: 'Reviews can only be submitted within 30 days of your appointment' }, { status: 400 })
    }

    // P2-2: Enforce minimum review text length server-side
    if (text && text.trim().length > 0 && text.trim().length < 20) {
      return NextResponse.json({ error: 'Review must be at least 20 characters' }, { status: 400 })
    }

    // Reject reviews containing contact info — do not sanitize, require clean submission
    if (text) {
      const filterResult = filterContactInfo(text)
      if (filterResult.flagged) {
        return NextResponse.json(
          {
            error: 'Your review contains contact information (phone number, email, or social handle). Please remove it and resubmit — you can message the artist directly through the platform.',
          },
          { status: 422 }
        )
      }
    }

    let review: Awaited<ReturnType<typeof prisma.review.create>>
    try {
      review = await prisma.review.create({
        data: {
          bookingId,
          customerId: session.user.id,
          rating,
          text: text ?? null,
          isVerifiedPurchase: true,
        },
      })
    } catch (err: unknown) {
      if (err instanceof Error && (err as { code?: string }).code === 'P2002') {
        return NextResponse.json({ error: 'You have already submitted a review for this booking.' }, { status: 409 })
      }
      throw err
    }

    const allReviews = await prisma.review.findMany({
      where: { booking: { providerId: booking.providerId }, isVisible: true },
    })

    // Only generate/regenerate AI summary if threshold met and not recently updated
    const reviewCount = await prisma.review.count({
      where: { booking: { providerId: booking.providerId }, isVisible: true },
    })

    if (reviewCount >= 10) {
      // P1-2: AI cost guard — skip if generated within 24h.
      // Uses aiSummaryUpdatedAt (a dedicated timestamp field) rather than updatedAt, so
      // unrelated profile saves don't reset the cooldown. Falls back to updatedAt if null.
      const providerProfile = await prisma.providerProfile.findFirst({
        where: { userId: booking.providerId },
        select: { id: true, aiSummary: true, aiSummaryUpdatedAt: true, updatedAt: true },
      })
      const lastUpdated = providerProfile?.aiSummaryUpdatedAt ?? providerProfile?.updatedAt ?? null
      const hoursSince = lastUpdated
        ? (Date.now() - lastUpdated.getTime()) / 3_600_000
        : 999

      // P1-5: Acquire generation lock — skip if another request is generating.
      // Uses the existing Redis rateLimit as a 30-second mutex (1 call per 30s per provider).
      // This prevents two concurrent reviews from both triggering AI summary generation
      // and the second write silently overwriting the first.
      const lockKey = `ai-summary-lock:${providerProfile?.id ?? booking.providerId}`
      const lockAcquired = await rateLimit(lockKey, 1, 30)

      if (!providerProfile?.aiSummary || hoursSince > 24) {
        if (!lockAcquired) {
          // P1-5: Another request is already generating a summary for this provider — skip.
        } else {
          const textReviews = allReviews.filter(r => r.text)
          if (textReviews.length > 0) {
            try {
              const reviewTexts = textReviews
                .slice(-20) // Use the 20 most-recent reviews for the summary
                .map(r => `Rating: ${r.rating}/5 - "${r.text}"`)
                .join('\n')

              const summary = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 200,
                messages: [{
                  role: 'user',
                  content: `Based on these fan reviews, write a 2-sentence neutral summary highlighting the talent's strengths and any consistent themes:

${reviewTexts}

Return only the 2-sentence summary, no preamble.`,
                }],
              })

                  const summaryText = summary.content[0].type === 'text' ? summary.content[0].text : null
              if (summaryText) {
                // Store the summary on the current review for backwards-compatibility
                await prisma.review.update({
                  where: { id: review.id },
                  data: { aiSummary: summaryText },
                })
                // P1-2: Also store on ProviderProfile with dedicated aiSummaryUpdatedAt timestamp
                // so the 24h cooldown check is accurate even when the profile is updated for other reasons.
                if (providerProfile?.id) {
                  await prisma.providerProfile.update({
                    where: { id: providerProfile.id },
                    data: { aiSummary: summaryText, aiSummaryUpdatedAt: new Date() },
                  }).catch(() => {})
                }
              }
            } catch (aiError) {
              // Non-blocking — AI summary failure should not fail the review submission
              console.error('AI summary error:', aiError)
            }
          }
        }
      }
    }

    await prisma.notification.create({
      data: {
        userId: booking.providerId,
        type: 'NEW_REVIEW',
        title: 'New Review Received',
        message: `You received a ${rating}-star review for ${booking.service.title}`,
        link: `/dashboard/provider/reviews`,
      },
    })

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
