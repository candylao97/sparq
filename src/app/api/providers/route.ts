import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, ServiceCategory } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function GET(req: NextRequest) {
  // TS-1: Rate limit search endpoint by IP — 100 requests per hour.
  // Prevents scraping and abuse of the public provider search API.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`search:${ip}`, 100, 3600)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as ServiceCategory | null
  // P1-1: Cap query length to prevent ReDoS on tagline/service Prisma contains
  const safeQuery = (searchParams.get('q') ?? '').slice(0, 200).trim()
  const q = safeQuery || null // preserve null-ish behaviour for downstream checks
  const location = searchParams.get('location')
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
  const serviceMode = searchParams.get('serviceMode') as 'AT_HOME' | 'STUDIO' | null
  const dateParam = searchParams.get('date') // YYYY-MM-DD
  const timeOfDay = searchParams.get('timeOfDay') as 'morning' | 'afternoon' | 'evening' | null
  const sortBy = searchParams.get('sortBy') || 'recommended'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '12')

  try {
    const where: Prisma.ProviderProfileWhereInput = {}
    where.accountStatus = 'ACTIVE'
    // P1-F: Profile completeness gate — tagline + suburb + at least one service
    // and one portfolio photo. (Bio was removed — tagline is the closest
    // remaining "have they filled out their profile?" signal.)
    where.AND = [
      { services: { some: { isActive: true, isDeleted: false } } },
      { portfolio: { some: {} } },
      { tagline: { not: null } },
      { suburb: { not: null } },
    ]
    // P4-1: Free-text search — filter on service titles, tagline, and provider name
    // P1-1: safeQuery is already trimmed and capped at 200 chars (ReDoS protection)
    if (safeQuery) {
      const qTrim = safeQuery;
      (where.AND as Prisma.ProviderProfileWhereInput[]).push({
        OR: [
          { user: { name: { contains: qTrim, mode: 'insensitive' } } },
          { tagline: { contains: qTrim, mode: 'insensitive' } },
          { suburb: { contains: qTrim, mode: 'insensitive' } },
          { services: { some: { title: { contains: qTrim, mode: 'insensitive' }, isActive: true, isDeleted: false } } },
        ],
      })
    }
    // Accumulate service filter conditions so category + price + mode don't overwrite each other
    const serviceConditions: Record<string, unknown> = { isActive: true, isDeleted: false }
    if (category) serviceConditions.category = category
    if (minPrice !== undefined) serviceConditions.price = { ...(serviceConditions.price as object ?? {}), gte: minPrice }
    if (maxPrice !== undefined) serviceConditions.price = { ...(serviceConditions.price as object ?? {}), lte: maxPrice }
    if (Object.keys(serviceConditions).length > 2 || category) {
      where.services = { some: serviceConditions }
    }

    if (location) {
      const safeLocation = location.replace(/%/g, '').replace(/_/g, '').trim()
      where.OR = [
        { suburb: { contains: safeLocation, mode: 'insensitive' } },
        { city: { contains: safeLocation, mode: 'insensitive' } },
      ]
    }

    if (serviceMode === 'AT_HOME') {
      where.offerAtHome = true
    } else if (serviceMode === 'STUDIO') {
      where.offerAtStudio = true
    }

    // Date availability filter: only return providers who have a non-blocked availability
    // on the requested date (date-specific override) or their weekly default for that day-of-week.
    if (dateParam) {
      const DAY_TO_SENTINEL: Record<number, string> = {
        1: '2000-01-03', 2: '2000-01-04', 3: '2000-01-05',
        4: '2000-01-06', 5: '2000-01-07', 6: '2000-01-08', 0: '2000-01-09',
      }
      const parseDateNoonUTC = (ds: string) => {
        const [y, m, d] = ds.split('-').map(Number)
        return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      }
      const bookingDateNoon = parseDateNoonUTC(dateParam)
      const dow = bookingDateNoon.getUTCDay()
      const sentinelStr = DAY_TO_SENTINEL[dow]
      const sentinelDate = sentinelStr ? parseDateNoonUTC(sentinelStr) : null

      // A provider is available if they have a non-blocked entry for either:
      //   1. The exact date (override), OR
      //   2. The sentinel date for the day-of-week (weekly default)
      where.availability = {
        some: {
          isBlocked: false,
          date: sentinelDate
            ? { in: [bookingDateNoon, sentinelDate] }
            : bookingDateNoon,
        },
      }
    }

    // Time-of-day filter: require at least one availability slot in the requested window
    if (timeOfDay) {
      const TIME_RANGES: Record<string, string[]> = {
        morning:   ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
        afternoon: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
        evening:   ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
      }
      const slots = TIME_RANGES[timeOfDay] ?? []
      if (slots.length > 0) {
        // Merge with existing availability filter if present
        const existingAvail = where.availability
        if (existingAvail && typeof existingAvail === 'object' && 'some' in existingAvail) {
          where.availability = {
            some: {
              ...(existingAvail as { some: object }).some,
              timeSlots: { hasSome: slots },
            },
          }
        } else {
          where.availability = {
            some: { isBlocked: false, timeSlots: { hasSome: slots } },
          }
        }
      }
    }

    // Build server-side orderBy. Price sorting (price_asc/price_desc) is handled
    // post-fetch since Prisma v5 doesn't support _min orderBy on relations.
    let orderBy: Prisma.ProviderProfileOrderByWithRelationInput | Prisma.ProviderProfileOrderByWithRelationInput[]
    if (sortBy === 'rating') {
      // averageRating is computed post-fetch; fall back to newest here and resort later
      orderBy = { createdAt: 'desc' }
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' }
    } else if (sortBy === 'score' || sortBy === 'recommended') {
      orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    } else {
      // price_asc / price_desc — post-fetch sort; default DB order
      orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    }

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        include: {
          user: true,
          services: { where: { isActive: true, isDeleted: false }, take: 3 },
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [ratingRows, monthlyBookingRows] = await Promise.all([
      providerUserIds.length > 0
        ? prisma.$queryRaw<{ providerUserId: string; avg: number; count: bigint }[]>`
            SELECT b."providerUserId", AVG(r.rating)::float AS avg, COUNT(r.rating) AS count
            FROM "Review" r
            JOIN "Booking" b ON b.id = r."bookingId"
            WHERE b."providerUserId" = ANY(${providerUserIds})
              AND r."isVisible" = true
            GROUP BY b."providerUserId"
          `
        : Promise.resolve([]),
      providerUserIds.length > 0
        ? prisma.$queryRaw<{ providerUserId: string; count: bigint }[]>`
            SELECT "providerUserId", COUNT(*) AS count
            FROM "Booking"
            WHERE "providerUserId" = ANY(${providerUserIds})
              AND status = 'COMPLETED'
              AND "createdAt" >= ${thirtyDaysAgo}
            GROUP BY "providerUserId"
          `
        : Promise.resolve([]),
    ])

    const ratingMap = new Map(ratingRows.map(r => [r.providerUserId, { avg: r.avg || 0, count: Number(r.count) }]))
    const monthlyMap = new Map(monthlyBookingRows.map(r => [r.providerUserId, Number(r.count)]))

    // UX-7: Batch-fetch the first future non-blocked availability date for each provider.
    // Availability.providerProfileId FKs to ProviderProfile.id — providerProfileIds above
    // is that set of keys, so this query matches on ProviderProfile.id, not User.id.
    const providerProfileIds = providers.map(p => p.id)
    const nextAvailRows = providerProfileIds.length > 0
      ? await prisma.$queryRaw<{ providerProfileId: string; date: Date }[]>`
          SELECT DISTINCT ON ("providerProfileId") "providerProfileId", date
          FROM "Availability"
          WHERE "providerProfileId" = ANY(${providerProfileIds})
            AND "isBlocked" = false
            AND date >= ${new Date()}
          ORDER BY "providerProfileId", date ASC
        `
      : []
    const nextAvailMap = new Map(nextAvailRows.map(r => [r.providerProfileId, r.date]))

    const now = new Date()
    const enriched = providers.map(p => {
      const rating = ratingMap.get(p.userId) || { avg: 0, count: 0 }
      // MON-5: A provider is only effectively featured if isFeatured=true AND featuredUntil has not passed
      const effectivelyFeatured = p.isFeatured && (!p.featuredUntil || p.featuredUntil > now)
      return {
        id: p.id,
        name: p.user.name,
        image: p.user.image,
        suburb: p.suburb,
        city: p.city,
        offerAtHome: p.offerAtHome,
        offerAtStudio: p.offerAtStudio,
        isVerified: p.isVerified,
        services: p.services,
        portfolio: p.portfolio,
        averageRating: rating.avg,
        reviewCount: rating.count,
        monthlyBookings: monthlyMap.get(p.userId) ?? 0,
        isFeatured: effectivelyFeatured,
        responseTimeHours: p.responseTimeHours ?? null,
        latitude: p.latitude,
        longitude: p.longitude,
        nextAvailableDate: nextAvailMap.get(p.id) ?? null,
      }
    })

    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null

    const enrichedWithDistance = enriched.map(p => ({
      ...p,
      distanceKm: (userLat !== null && userLng !== null && p.latitude && p.longitude)
        ? Math.round(haversineKm(userLat, userLng, p.latitude, p.longitude) * 10) / 10
        : null,
    }))

    // Apply post-fetch sorts (price and rating require enriched data; distance requires geo coords)
    let finalProviders = [...enrichedWithDistance]
    if (sortBy === 'price_asc') {
      finalProviders.sort((a, b) => {
        const aMin = a.services.length ? Math.min(...a.services.map(s => s.price)) : Infinity
        const bMin = b.services.length ? Math.min(...b.services.map(s => s.price)) : Infinity
        return aMin - bMin
      })
    } else if (sortBy === 'price_desc') {
      finalProviders.sort((a, b) => {
        const aMin = a.services.length ? Math.min(...a.services.map(s => s.price)) : 0
        const bMin = b.services.length ? Math.min(...b.services.map(s => s.price)) : 0
        return bMin - aMin
      })
    } else if (sortBy === 'rating') {
      finalProviders.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    } else if (userLat !== null && (sortBy === 'score' || sortBy === 'recommended')) {
      // Distance-first when user location is available
      finalProviders.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    } else if (sortBy === 'score' || sortBy === 'recommended') {
      // MH-2: Boost complete, verified profiles in default ranking.
      // Completeness score is derived from portfolio count, verification status, and rating.
      // Featured profiles always rank first; within each group completeness breaks ties.
      // MON-5: isFeatured already reflects expiry (effectivelyFeatured) so expired featured
      // listings that were DB-sorted to the front are corrected post-fetch.
      const ranked = finalProviders.map(p => {
        const photoScore = Math.min((p.portfolio?.length ?? 0) / 5, 1) * 0.2
        const verifiedScore = p.isVerified ? 0.3 : 0
        const ratingScore = ((p.averageRating ?? 0) / 5) * 0.3
        const completenessBoost = photoScore + verifiedScore + ratingScore
        return { ...p, _rankScore: completenessBoost * 10 }
      })
      ranked.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1
        if (!a.isFeatured && b.isFeatured) return 1
        return b._rankScore - a._rankScore
      })
      finalProviders = ranked
    }

    return NextResponse.json({ providers: finalProviders, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Providers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}
