import Link from 'next/link'
import Image from 'next/image'
import { Star, ArrowRight, BadgeCheck, Lock, Search, Zap } from 'lucide-react'
import { prisma } from '@/lib/prisma'

async function getPlatformStats() {
  try {
    const [reviewStats, verifiedCount] = await Promise.all([
      prisma.review.aggregate({
        where: { isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.providerProfile.count({ where: { isVerified: true } }),
    ])
    const avg = reviewStats._avg.rating ?? 0
    return {
      avgRating: avg > 0 ? avg.toFixed(1) : null,
      verifiedCount,
    }
  } catch {
    return { avgRating: null, verifiedCount: 0 }
  }
}

async function getFeaturedProviders() {
  try {
    // P4-6: Order by isFeatured desc first, then accountStatus ACTIVE only,
    // then createdAt desc so featured/verified artists appear above recent newcomers.
    const providers = await prisma.user.findMany({
      where: {
        role: { in: ['PROVIDER', 'BOTH'] },
        providerProfile: {
          is: {
            accountStatus: 'ACTIVE',
            bio: { not: null },
            suburb: { not: null },
          },
        },
      },
      include: {
        providerProfile: {
          include: {
            services: { take: 1, orderBy: { price: 'asc' } },
            portfolio: { take: 1 },
          },
        },
      },
      orderBy: [
        { providerProfile: { isFeatured: 'desc' } },
        { providerProfile: { isVerified: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: 6,
    })

    const providerIds = providers.map(p => p.id)
    const ratingRows = providerIds.length > 0
      ? await prisma.$queryRaw<{ providerId: string; avg: number; count: bigint }[]>`
          SELECT b."providerUserId", AVG(r.rating)::float AS avg, COUNT(r.rating) AS count
          FROM "Review" r
          JOIN "Booking" b ON b.id = r."bookingId"
          WHERE b."providerUserId" = ANY(${providerIds})
            AND r."isVisible" = true
          GROUP BY b."providerUserId"
        `
      : []
    const ratingMap = new Map(ratingRows.map(r => [r.providerId, { avg: r.avg || 0, count: Number(r.count) }]))

    return providers.map(p => ({
      id: p.id,
      name: p.name || 'Artist',
      image: p.providerProfile?.portfolio[0]?.url || p.image || null,
      bio: p.providerProfile?.bio || '',
      service: p.providerProfile?.services[0]?.title || 'Beauty service',
      category: p.providerProfile?.services[0]?.category || '',
      price: p.providerProfile?.services[0]?.price || 0,
      rating: ratingMap.get(p.id)?.avg || 0,
      reviewCount: ratingMap.get(p.id)?.count || 0,
    }))
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [featured, platformStats] = await Promise.all([
    getFeaturedProviders(),
    getPlatformStats(),
  ])

  return (
    <div className="bg-[#FDFBF7]">

      {/* ─── 1. HERO — clean, text-forward, cream background ─── */}
      <section className="py-20 md:py-28 px-6 sm:px-10">
        <div className="max-w-2xl mx-auto text-center">

          <h1 className="font-headline
                         text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem]
                         text-[#1A1A1A] leading-[1.08] tracking-[-0.02em] mb-5">
            Book trusted nail and<br className="hidden sm:block" />
            {' '}lash artists near you
          </h1>

          <p className="text-base sm:text-lg text-[#717171] leading-relaxed mb-10 max-w-md mx-auto">
            Browse real portfolios, read honest reviews, and book in minutes.
          </p>

          {/* Search bar */}
          <form
            action="/search"
            method="GET"
            className="flex items-center bg-white rounded-full shadow-lg shadow-black/8
                       border border-[#e8e1de] overflow-hidden mb-6 mx-auto max-w-xl"
          >
            <Search className="h-4 w-4 text-[#717171] flex-shrink-0 ml-5 mr-1" />
            <input
              type="text"
              name="q"
              placeholder="Gel nails, lash extensions, nail art…"
              className="flex-1 pl-2 pr-4 py-4 text-sm text-[#1A1A1A]
                         placeholder:text-[#717171] focus:outline-none bg-transparent"
            />
            <button
              type="submit"
              className="bg-[#E96B56] hover:bg-[#a63a29] transition-colors
                         text-white font-semibold text-sm
                         px-7 py-4 flex-shrink-0 flex items-center gap-2"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick-search chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Gel nails', q: 'gel nails' },
              { label: 'Lash extensions', q: 'lash extensions' },
              { label: 'Nail art', q: 'nail art' },
              { label: 'Volume lashes', q: 'volume lashes' },
              { label: 'At home', q: 'at home' },
            ].map(({ label, q }) => (
              <Link
                key={label}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="bg-white border border-[#e8e1de] text-[#717171] text-xs
                           font-medium px-4 py-2 rounded-full hover:border-[#E96B56]
                           hover:text-[#E96B56] transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* ─── 2. Trust Strip ─── */}
      <div className="border-t border-b border-[#e8e1de] bg-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-[#717171]">
          <span className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-[#E96B56]" />
            Every artist is verified
          </span>
          <span className="hidden sm:block w-px h-4 bg-[#e8e1de]" />
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#E96B56]" />
            Secure payments
          </span>
          <span className="hidden sm:block w-px h-4 bg-[#e8e1de]" />
          <span>Honest reviews</span>
          <span className="hidden sm:block w-px h-4 bg-[#e8e1de]" />
          <span>Free cancellation</span>
        </div>
      </div>


      {/* ─── 3. Category Cards — Nails + Lashes ─── */}
      <section className="px-6 sm:px-10 lg:px-16 xl:px-24 py-20">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E96B56] mb-3">Browse by category</p>
          <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.05]">
            What are you looking for?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">

          {/* Nails */}
          <Link
            href="/search?category=NAILS"
            className="group flex items-center gap-5 bg-white border border-[#e8e1de]
                       rounded-2xl p-5 hover:shadow-md hover:border-[#E96B56]/30
                       transition-all duration-200"
          >
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop&q=80"
                alt="Nail services"
                fill
                sizes="80px"
                className="object-cover group-hover:scale-[1.08] transition-transform duration-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-headline text-xl text-[#1A1A1A] mb-1">Nails</h3>
              <p className="text-sm text-[#717171] mb-3">Gel, acrylic, nail art &amp; more</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#E96B56]
                               group-hover:gap-2 transition-all duration-200">
                Browse artists <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* Lashes */}
          <Link
            href="/search?category=LASHES"
            className="group flex items-center gap-5 bg-white border border-[#e8e1de]
                       rounded-2xl p-5 hover:shadow-md hover:border-[#E96B56]/30
                       transition-all duration-200"
          >
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=200&h=200&fit=crop&q=80"
                alt="Lash services"
                fill
                sizes="80px"
                className="object-cover group-hover:scale-[1.08] transition-transform duration-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-headline text-xl text-[#1A1A1A] mb-1">Lashes</h3>
              <p className="text-sm text-[#717171] mb-3">Extensions, lifts, tints &amp; more</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#E96B56]
                               group-hover:gap-2 transition-all duration-200">
                Browse artists <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>


      {/* ─── 4. Featured Artists ─── */}
      {featured.length > 0 && (
        <section className="px-6 sm:px-10 lg:px-16 xl:px-24 py-20 bg-[#f9f2ef]">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E96B56] mb-3">Trending now</p>
              <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl text-[#1A1A1A] leading-[1.05]">
                Looks people are loving
              </h2>
              <p className="text-base text-[#717171] mt-2 leading-relaxed">
                Styles clients keep coming back for.
              </p>
            </div>
            <Link
              href="/search"
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold
                         text-[#E96B56] hover:text-[#a63a29] transition-colors"
            >
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {featured.slice(0, 4).map((provider) => (
              <Link
                key={provider.id}
                href={`/providers/${provider.id}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden block bg-[#f3ece9] cursor-pointer"
              >
                {provider.image ? (
                  <Image
                    src={provider.image}
                    alt={provider.service}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-[1.05] transition-transform duration-700"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-4xl font-light text-[#e8e1de]">
                      {provider.service.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/0" />

                {/* Top: category + rating */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  {provider.category && (
                    <span className="bg-white/15 backdrop-blur-md border border-white/20
                                     text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      {provider.category === 'NAILS' ? 'Nails' : provider.category === 'LASHES' ? 'Lashes' : provider.category}
                    </span>
                  )}
                  {provider.reviewCount > 0 ? (
                    <div className="ml-auto bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full
                                    flex items-center gap-1 shadow-sm">
                      <Star className="h-3 w-3 fill-[#E96B56] text-[#E96B56]" />
                      <span className="text-xs font-bold text-[#1A1A1A]">
                        {provider.rating.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[#f9f2ef] text-[#717171]">New</span>
                  )}
                </div>

                {/* Bottom: service name + artist + price */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <p className="font-headline text-[1.1rem] md:text-xl text-white leading-snug mb-1.5 line-clamp-2">
                    {provider.service}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white/50 text-xs truncate">
                      by {provider.name.split(' ')[0]}
                    </p>
                    {provider.price > 0 && (
                      <span className="text-white text-xs font-semibold flex-shrink-0">
                        from ${provider.price}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link href="/search" className="text-sm font-semibold text-[#E96B56] hover:text-[#a63a29]">
              See all looks →
            </Link>
          </div>
        </section>
      )}


      {/* ─── 5. How It Works ─── */}
      <section className="px-6 sm:px-10 lg:px-16 xl:px-24 py-20 bg-white">
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E96B56] mb-4">
            Simple by design
          </p>
          <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.05]">
            Book in three steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-12">
          {[
            {
              step: '01',
              icon: <Search className="w-5 h-5 text-[#E96B56]" />,
              title: 'Browse',
              body: 'Explore real portfolios, read verified reviews, and find the style you love.',
            },
            {
              step: '02',
              icon: <Zap className="w-5 h-5 text-[#E96B56]" />,
              title: 'Book',
              body: 'Pick your service, choose a time that works, and confirm in seconds.',
            },
            {
              step: '03',
              icon: <Star className="w-5 h-5 text-[#E96B56]" />,
              title: 'Enjoy',
              body: 'Your artist arrives ready. Sit back, relax, and leave looking your best.',
            },
          ].map(({ step, icon, title, body }) => (
            <div key={step} className="flex gap-5">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#f9f2ef] flex items-center justify-center">
                  {icon}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#717171] mb-1">{step}</p>
                <h3 className="font-headline text-xl text-[#1A1A1A] mb-2">{title}</h3>
                <p className="text-[#717171] leading-relaxed text-sm">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/search"
          className="inline-flex items-center gap-2 bg-[#E96B56] hover:bg-[#a63a29]
                     transition-colors text-white font-semibold px-8 py-4 rounded-full
                     text-base shadow-lg shadow-[#E96B56]/20"
        >
          Find an artist near you
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

    </div>
  )
}
