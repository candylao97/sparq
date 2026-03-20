import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        services: { where: { isActive: true } },
        portfolio: { orderBy: { order: 'asc' } },
        scoreFactors: true,
        verification: true,
      },
    })

    if (!profile) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    // Check if requesting user has a confirmed/completed booking with this provider
    const session = await getServerSession(authOptions)
    let showContactInfo = false
    if (session?.user?.id) {
      const confirmedBooking = await prisma.booking.findFirst({
        where: {
          customerId: session.user.id,
          providerId: profile.userId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
      })
      showContactInfo = !!confirmedBooking
    }

    // Strip contact info from user data unless authorized
    const sanitizedProfile = {
      ...profile,
      studioAddress: showContactInfo ? profile.studioAddress : null,
      user: {
        ...profile.user,
        ...(showContactInfo ? {} : { phone: null, email: null }),
      },
    }

    const reviews = await prisma.review.findMany({
      where: {
        booking: { providerId: profile.userId },
        isVisible: true,
      },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    let aiSummary: string | null = null
    if (reviews.length >= 10 && reviews[0]?.aiSummary) {
      aiSummary = reviews[0].aiSummary
    }

    return NextResponse.json({
      profile: sanitizedProfile,
      reviews,
      averageRating: avgRating,
      reviewCount: reviews.length,
      aiSummary,
    })
  } catch (error) {
    console.error('Provider detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 })
  }
}
