import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, ServiceCategory } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as ServiceCategory | null
  const location = searchParams.get('location')
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
  const serviceMode = searchParams.get('serviceMode') as 'AT_HOME' | 'STUDIO' | null
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')

  try {
    const where: Prisma.ProviderProfileWhereInput = {}
    if (category) {
      where.services = { some: { category, isActive: true } }
    }
    if (location) {
      where.OR = [
        { suburb: { contains: location, mode: 'insensitive' } },
        { city: { contains: location, mode: 'insensitive' } },
      ]
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.services = {
        ...where.services,
        some: {
          ...where.services?.some,
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        },
      }
    }
    if (serviceMode === 'AT_HOME') {
      where.offerAtHome = true
    } else if (serviceMode === 'STUDIO') {
      where.offerAtStudio = true
    }

    // Note: Prisma v5 doesn't support _min orderBy on relations.
    // Price sorting is handled client-side after fetch for now; default to createdAt.
    const orderBy: Prisma.ProviderProfileOrderByWithRelationInput = { createdAt: 'desc' }

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        include: {
          user: true,
          services: { where: { isActive: true }, take: 3 },
          portfolio: { take: 3, orderBy: { order: 'asc' } },
          _count: { select: { services: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.providerProfile.count({ where }),
    ])

    // Batch-fetch ratings for all providers in a single query (fixes N+1)
    const providerUserIds = providers.map(p => p.userId)
    const ratingRows = providerUserIds.length > 0
      ? await prisma.$queryRaw<{ providerId: string; avg: number; count: bigint }[]>`
          SELECT b."providerId", AVG(r.rating)::float AS avg, COUNT(r.rating) AS count
          FROM "Review" r
          JOIN "Booking" b ON b.id = r."bookingId"
          WHERE b."providerId" = ANY(${providerUserIds})
            AND r."isVisible" = true
          GROUP BY b."providerId"
        `
      : []
    const ratingMap = new Map(ratingRows.map(r => [r.providerId, { avg: r.avg || 0, count: Number(r.count) }]))

    const enriched = providers.map(p => {
      const rating = ratingMap.get(p.userId) || { avg: 0, count: 0 }
      return {
        id: p.id,
        name: p.user.name,
        image: p.user.image,
        suburb: p.suburb,
        city: p.city,
        tier: p.tier,
        subscriptionPlan: p.subscriptionPlan,
        offerAtHome: p.offerAtHome,
        offerAtStudio: p.offerAtStudio,
        isVerified: p.isVerified,
        services: p.services,
        portfolio: p.portfolio,
        averageRating: rating.avg,
        reviewCount: rating.count,
      }
    })

    return NextResponse.json({ providers: enriched, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Providers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}
