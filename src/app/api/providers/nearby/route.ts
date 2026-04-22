import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ServiceCategory } from '@prisma/client'

const SUBURB_COORDS: Record<string, [number, number]> = {
  richmond: [-37.8183, 144.9977],
  hawthorn: [-37.8224, 145.0273],
  toorak: [-37.8428, 145.0144],
  'box hill': [-37.8194, 145.1213],
  fitzroy: [-37.7981, 144.9789],
  'south yarra': [-37.8394, 145.0000],
  prahran: [-37.8500, 144.9936],
  collingwood: [-37.8031, 144.9872],
  carlton: [-37.7992, 144.9706],
  brunswick: [-37.7657, 144.9612],
}

const DEFAULT_COORDS: [number, number] = [-37.8136, 144.9631] // Melbourne CBD

function getCoords(p: { latitude: number | null; longitude: number | null; suburb: string | null }): [number, number] {
  if (p.latitude != null && p.longitude != null) {
    return [p.latitude, p.longitude]
  }
  if (p.suburb) {
    const key = p.suburb.toLowerCase().trim()
    if (SUBURB_COORDS[key]) return SUBURB_COORDS[key]
  }
  return DEFAULT_COORDS
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as ServiceCategory | null
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null
  const minRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : null

  try {
    const profiles = await prisma.providerProfile.findMany({
      where: {
        accountStatus: 'ACTIVE',
        services: {
          some: {
            isActive: true,
            ...(category ? { category } : {}),
          },
        },
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        services: {
          where: {
            isActive: true,
            ...(category ? { category } : {}),
          },
          select: {
            id: true,
            title: true,
            price: true,
            duration: true,
          },
          orderBy: { price: 'asc' },
        },
      },
    })

    if (profiles.length === 0) {
      return NextResponse.json({ providers: [] })
    }

    const providerIds = profiles.map(p => p.id)

    // Batch fetch avg ratings
    const ratingsRaw = await prisma.$queryRaw<{ providerId: string; avg: number | null }[]>`
      SELECT b."providerUserId", AVG(r.rating) as avg
      FROM "Review" r
      JOIN "Booking" b ON r."bookingId" = b.id
      WHERE b."providerUserId" = ANY(${providerIds})
      GROUP BY b."providerUserId"
    `

    const ratingsMap = new Map<string, number>()
    for (const row of ratingsRaw) {
      ratingsMap.set(row.providerId, row.avg ? Number(row.avg) : 0)
    }

    const providers = profiles
      .map(p => {
        if (p.services.length === 0) return null

        const avgRating = ratingsMap.get(p.id) ?? 0
        if (minRating != null && avgRating < minRating) return null

        const minSvcPrice = p.services.reduce((min, s) => Math.min(min, s.price), Infinity)
        if (minPrice != null && minSvcPrice < minPrice) return null
        if (maxPrice != null && minSvcPrice > maxPrice) return null

        const [lat, lng] = getCoords(p)

        return {
          id: p.id,
          name: p.user.name ?? 'Artist',
          image: p.user.image,
          suburb: p.suburb,
          offerAtHome: p.offerAtHome,
          offerAtStudio: p.offerAtStudio,
          minPrice: minSvcPrice === Infinity ? 0 : minSvcPrice,
          avgRating,
          lat,
          lng,
          services: p.services.map(s => ({
            id: s.id,
            title: s.title,
            price: s.price,
            duration: s.duration,
          })),
        }
      })
      .filter(Boolean)

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('[/api/providers/nearby]', error)
    return NextResponse.json({ error: 'Failed to fetch nearby providers' }, { status: 500 })
  }
}
