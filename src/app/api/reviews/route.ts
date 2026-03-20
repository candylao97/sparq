import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bookingId, rating, text } = await req.json()

    // Validate rating is an integer between 1 and 5
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    })

    if (!booking || booking.customerId !== session.user.id || booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Invalid booking' }, { status: 400 })
    }

    // Filter contact info from review text
    let sanitizedText = text
    let isFlagged = false
    let flagReason: string | undefined
    if (text) {
      const filterResult = filterContactInfo(text)
      if (filterResult.flagged) {
        sanitizedText = filterResult.text
        isFlagged = true
        flagReason = 'Contact information detected'
      }
    }

    const review = await prisma.review.create({
      data: {
        bookingId,
        customerId: session.user.id,
        rating,
        text: sanitizedText,
        isVerifiedPurchase: true,
        ...(isFlagged ? { isFlagged: true, flagReason } : {}),
      },
    })

    const allReviews = await prisma.review.findMany({
      where: { booking: { providerId: booking.providerId }, isVisible: true },
    })

    if (allReviews.length >= 10) {
      const reviewTexts = allReviews
        .filter(r => r.text)
        .slice(0, 20)
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
        await prisma.review.update({
          where: { id: review.id },
          data: { aiSummary: summaryText },
        })
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
