import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!customerProfile || customerProfile.savedProviders.length === 0) {
      return NextResponse.json({ providers: [] })
    }

    const providerUsers = await prisma.user.findMany({
      where: { id: { in: customerProfile.savedProviders } },
      include: {
        providerProfile: {
          include: {
            services: { where: { isActive: true }, orderBy: { price: 'asc' } },
            portfolio: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
      },
    })

    const providers = providerUsers
      .filter((u) => u.providerProfile)
      .map((u) => {
        const pp = u.providerProfile!

        return {
          id: u.id,
          name: u.name || 'Unknown',
          image: u.image,
          suburb: pp.suburb,
          city: pp.city,
          offerAtHome: pp.offerAtHome,
          offerAtStudio: pp.offerAtStudio,
          isVerified: pp.isVerified,
          services: pp.services.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category,
            price: s.price,
            duration: s.duration,
            locationTypes: s.locationTypes,
          })),
          portfolio: pp.portfolio.map((p) => ({ id: p.id, url: p.url, caption: p.caption })),
          averageRating: 0,
          reviewCount: 0,
        }
      })

    // Fetch review data per provider for accurate ratings
    const providerIds = providers.map((p) => p.id)
    const bookingsWithReviews = await prisma.booking.findMany({
      where: {
        providerUserId: { in: providerIds },
        review: { isNot: null },
      },
      include: { review: true },
    })

    const ratingMap: Record<string, { sum: number; count: number }> = {}
    for (const b of bookingsWithReviews) {
      if (b.review) {
        if (!ratingMap[b.providerUserId]) ratingMap[b.providerUserId] = { sum: 0, count: 0 }
        ratingMap[b.providerUserId].sum += b.review.rating
        ratingMap[b.providerUserId].count += 1
      }
    }

    for (const p of providers) {
      const r = ratingMap[p.id]
      if (r) {
        p.averageRating = r.sum / r.count
        p.reviewCount = r.count
      }
    }

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Wishlists GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch wishlists' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { providerId } = await req.json()
    if (!providerId) return NextResponse.json({ error: 'providerId is required' }, { status: 400 })

    // Upsert customer profile — create if it doesn't exist
    const customerProfile = await prisma.customerProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    })

    // Avoid duplicates
    if (customerProfile.savedProviders.includes(providerId)) {
      return NextResponse.json({ message: 'Already saved' })
    }

    await prisma.customerProfile.update({
      where: { userId: session.user.id },
      data: {
        savedProviders: { push: providerId },
      },
    })

    return NextResponse.json({ message: 'Provider saved' })
  } catch (error) {
    console.error('Wishlists POST error:', error)
    return NextResponse.json({ error: 'Failed to save provider' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { providerId } = await req.json()
    if (!providerId) return NextResponse.json({ error: 'providerId is required' }, { status: 400 })

    // Use a raw query approach to atomically remove the provider
    // First check profile exists, then update in one step
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
      select: { savedProviders: true },
    })

    if (!customerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await prisma.customerProfile.update({
      where: { userId: session.user.id },
      data: {
        savedProviders: {
          set: customerProfile.savedProviders.filter((id) => id !== providerId),
        },
      },
    })

    return NextResponse.json({ message: 'Provider removed' })
  } catch (error) {
    console.error('Wishlists DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove provider' }, { status: 500 })
  }
}
