import { prisma } from '@/lib/prisma'
import { HomeNav } from '@/components/home/HomeNav'
import { HomeHero } from '@/components/home/HomeHero'
import { HomeCategories } from '@/components/home/HomeCategories'
import { HomeFeatured, type FeaturedArtist } from '@/components/home/HomeFeatured'
import { HomeHowItWorks } from '@/components/home/HomeHowItWorks'
import { HomeArtistCta } from '@/components/home/HomeArtistCta'
import { HomeFooter } from '@/components/home/HomeFooter'

export const metadata = {
  title: 'Sparq — Book trusted nail, lash & makeup artists in Melbourne',
  description:
    'Browse real portfolios, read honest reviews, and book your next appointment in under two minutes. Verified Melbourne artists across Nails, Lashes & Makeup.',
}

// Static fallback mirrors the design mockup; used when the live query is empty
// (currently the case due to the known provider-visibility filter).
const STATIC_FEATURED: FeaturedArtist[] = [
  { id: null, name: 'Charlotte Reid',  category: 'Nails',  blurb: 'BIAB & soft glam',      suburb: 'South Yarra',     rating: '4.97', price: 95,  badge: 'Top-rated', tone: 1 },
  { id: null, name: 'Hannah Patel',    category: 'Nails',  blurb: 'Builder gel, nail art', suburb: 'Fitzroy',         rating: '4.92', price: 110, badge: 'Verified',  tone: 2 },
  { id: null, name: 'Mei Tanaka',      category: 'Lashes', blurb: 'Volume sets, refills',  suburb: 'Carlton',         rating: '4.95', price: 140, badge: 'Verified',  tone: 4 },
  { id: null, name: 'Olivia Bennett',  category: 'Makeup', blurb: 'Bridal trials',         suburb: 'Toorak',          rating: '5.00', price: 260, badge: 'New',       tone: 3 },
  { id: null, name: 'Aroha Davis',     category: 'Lashes', blurb: 'Classic & hybrid',      suburb: 'Northcote',       rating: '4.91', price: 120, badge: 'Featured',  tone: 5 },
  { id: null, name: 'Sofia Marchetti', category: 'Nails',  blurb: 'Chrome & hand-painted', suburb: 'Richmond',        rating: '4.88', price: 105, badge: 'Verified',  tone: 6 },
  { id: null, name: 'Lina Chen',       category: 'Makeup', blurb: 'Editorial & day-of',    suburb: 'South Melbourne', rating: '4.96', price: 220, badge: 'Top-rated', tone: 7 },
  { id: null, name: 'Eliza Romano',    category: 'Lashes', blurb: 'Hybrid refills',        suburb: 'Prahran',         rating: '4.90', price: 155, badge: 'New',       tone: 8 },
]

async function getFeaturedArtists(): Promise<FeaturedArtist[]> {
  try {
    const providers = await prisma.user.findMany({
      where: {
        role: { in: ['PROVIDER', 'BOTH'] },
        providerProfile: {
          is: { accountStatus: 'ACTIVE', tagline: { not: null }, suburb: { not: null } },
        },
      },
      include: {
        providerProfile: { include: { services: { take: 1, orderBy: { price: 'asc' } } } },
      },
      orderBy: [
        { providerProfile: { isFeatured: 'desc' } },
        { providerProfile: { isVerified: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: 8,
    })

    if (providers.length === 0) return STATIC_FEATURED

    const ids = providers.map((p) => p.id)
    const ratingRows = await prisma.$queryRaw<
      { providerUserId: string; avg: number; count: bigint }[]
    >`
      SELECT b."providerUserId", AVG(r.rating)::float AS avg, COUNT(r.rating) AS count
      FROM "Review" r
      JOIN "Booking" b ON b.id = r."bookingId"
      WHERE b."providerUserId" = ANY(${ids}) AND r."isVisible" = true
      GROUP BY b."providerUserId"
    `
    const ratingMap = new Map(ratingRows.map((r) => [r.providerUserId, r.avg || 0]))

    return providers.map((p, i): FeaturedArtist => {
      const prof = p.providerProfile
      const svc = prof?.services[0]
      const r = ratingMap.get(p.id) || 0
      return {
        id: p.id,
        name: p.name || 'Artist',
        category: svc?.category || 'Beauty',
        blurb: prof?.tagline?.slice(0, 32) || svc?.title || '',
        suburb: prof?.suburb || '',
        rating: r > 0 ? r.toFixed(2) : 'New',
        price: svc?.price || 0,
        badge: prof?.isFeatured ? 'Featured' : prof?.isVerified ? 'Verified' : 'New',
        tone: (i % 8) + 1,
      }
    })
  } catch {
    return STATIC_FEATURED
  }
}

export default async function HomePage() {
  const featured = await getFeaturedArtists()

  return (
    <div className="bg-white text-sparq-ink">
      <HomeNav />
      <HomeHero />
      <HomeCategories />
      <HomeFeatured artists={featured} />
      <HomeHowItWorks />
      <HomeArtistCta />
      <HomeFooter />
    </div>
  )
}
