import Link from 'next/link'
import Image from 'next/image'
import { Star, ArrowRight, BadgeCheck, Lock } from 'lucide-react'
import { prisma } from '@/lib/prisma'

async function getFeaturedProviders() {
  try {
    const providers = await prisma.user.findMany({
      where: {
        role: { in: ['PROVIDER', 'BOTH'] },
        providerProfile: { isNot: null },
      },
      include: {
        providerProfile: {
          include: {
            services: { take: 1, orderBy: { price: 'asc' } },
            portfolio: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })

    const providerIds = providers.map(p => p.id)
    const ratingRows = providerIds.length > 0
      ? await prisma.$queryRaw<{ providerId: string; avg: number; count: bigint }[]>`
          SELECT b."providerId", AVG(r.rating)::float AS avg, COUNT(r.rating) AS count
          FROM "Review" r
          JOIN "Booking" b ON b.id = r."bookingId"
          WHERE b."providerId" = ANY(${providerIds})
            AND r."isVisible" = true
          GROUP BY b."providerId"
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
  const featured = await getFeaturedProviders()

  return (
    <div className="bg-[#FDFBF7]">

      {/* ─── 1. Hero — What Sparq is + primary CTA ─── */}
      <section className="px-6 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E96B56] mb-6">
            Nail &amp; lash artists near you
          </p>
          <h1 className="font-headline text-[3rem] md:text-[4.5rem] lg:text-[5.5rem] text-[#1A1A1A] leading-[1.05] tracking-[-0.02em] mb-6">
            Book beauty,
            <br />
            <span className="italic text-[#E96B56]">effortlessly.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#3D3D3D] leading-[1.7] mb-10 max-w-lg mx-auto">
            Explore real work, read genuine reviews, and book in minutes — at home or in-studio.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-8 py-4 text-base font-semibold text-white hover:bg-[#a63a29] transition-colors shadow-lg shadow-[#E96B56]/20"
            >
              Book your appointment
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/20 px-8 py-4 text-base font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors"
            >
              Become an artist
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#717171]">
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-[#E96B56] text-[#E96B56]" />
              <span className="font-semibold text-[#1A1A1A]">4.9</span> average rating
            </span>
            <span className="w-px h-4 bg-[#e8e1de]" />
            <span className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-[#E96B56]" />
              Verified artists
            </span>
            <span className="w-px h-4 bg-[#e8e1de]" />
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#E96B56]" />
              Secure payments
            </span>
          </div>
        </div>
      </section>

      {/* ─── 2. Service Mode — HOW do you want it? ─── */}
      <section className="bg-white border-y border-[#e8e1de] py-14">
        <div className="px-6 max-w-[1600px] mx-auto">

          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="section-label mb-3">Your experience</p>
              <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
                Choose how you want your service
              </h2>
            </div>
            <p className="text-sm text-[#8A8A8A] sm:text-right sm:max-w-[220px] leading-relaxed flex-shrink-0">
              At home or in a studio —<br className="hidden sm:block" /> whatever fits your day.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">

            {/* ── At-home card ── */}
            <Link
              href="/search?mode=HOME"
              className="group relative rounded-[1.875rem] overflow-hidden block min-h-[400px] md:min-h-[440px] bg-[#f3ece9] cursor-pointer"
            >
              <Image
                src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&h=700&fit=crop&q=85"
                alt="At-home beauty service"
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
              />

              {/* Warm gradient — intimate, soft */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c0800]/82 via-black/20 to-black/0" />

              {/* Most popular badge */}
              <div className="absolute top-5 left-5">
                <span className="inline-flex items-center gap-1.5 bg-[#E96B56] text-white text-[11px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  Most popular
                </span>
              </div>

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['No travel', 'More comfort'].map(tag => (
                    <span
                      key={tag}
                      className="bg-white/12 backdrop-blur-sm border border-white/18 text-white/85 text-xs font-medium px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-headline text-2xl md:text-[1.75rem] text-white leading-[1.1] mb-2">
                  At-home service
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Relax while your artist comes to you.
                </p>
              </div>
            </Link>

            {/* ── Studio card ── */}
            <Link
              href="/search?mode=STUDIO"
              className="group relative rounded-[1.875rem] overflow-hidden block min-h-[400px] md:min-h-[440px] bg-[#e8e4e0] cursor-pointer"
            >
              <Image
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&h=700&fit=crop&q=85"
                alt="Studio beauty experience"
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover object-center group-hover:scale-[1.04] transition-transform duration-700"
              />

              {/* Cool/neutral gradient — clean, professional */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/82 via-black/18 to-black/0" />

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Dedicated space', 'Salon quality'].map(tag => (
                    <span
                      key={tag}
                      className="bg-white/12 backdrop-blur-sm border border-white/18 text-white/85 text-xs font-medium px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-headline text-2xl md:text-[1.75rem] text-white leading-[1.1] mb-2">
                  Studio experience
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Enjoy a professional beauty setup.
                </p>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* ─── 3. Categories — WHAT service do you want? ─── */}
      <section className="px-6 py-16 max-w-[1600px] mx-auto">
        <div className="mb-10">
          <p className="section-label mb-3">Services</p>
          <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
            Browse by category
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {/* Nails */}
          <Link
            href="/search?category=NAILS"
            className="group relative aspect-[4/3] rounded-[1.875rem] overflow-hidden block bg-[#f3ece9]"
          >
            <Image
              src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&h=675&fit=crop&q=85"
              alt="Nail art close-up"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h3 className="font-headline text-2xl md:text-[1.75rem] text-white mb-1.5">Nails</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-5">Gel, acrylics, nail art, manicures &amp; more</p>
              <span className="inline-flex items-center gap-2 bg-white text-[#1A1A1A] text-sm font-semibold px-5 py-2.5 rounded-full group-hover:bg-[#E96B56] group-hover:text-white transition-all duration-300">
                Browse artists <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* Lashes */}
          <Link
            href="/search?category=LASHES"
            className="group relative aspect-[4/3] rounded-[1.875rem] overflow-hidden block bg-[#f3ece9]"
          >
            <Image
              src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&h=675&fit=crop&q=85"
              alt="Lash extensions close-up"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h3 className="font-headline text-2xl md:text-[1.75rem] text-white mb-1.5">Lashes</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-5">Classic, volume, hybrid, lifts &amp; tints</p>
              <span className="inline-flex items-center gap-2 bg-white text-[#1A1A1A] text-sm font-semibold px-5 py-2.5 rounded-full group-hover:bg-[#E96B56] group-hover:text-white transition-all duration-300">
                Browse artists <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 4. Trending Looks — WHO do you choose? ─── */}
      {featured.length > 0 && (
        <section className="px-6 py-16 max-w-[1600px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="section-label mb-3">Trending now</p>
              <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
                Looks people are loving
              </h2>
              <p className="text-base text-[#555] mt-2 leading-relaxed">
                Styles clients keep coming back for.
              </p>
            </div>
            <Link
              href="/search"
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors"
            >
              See all looks <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {featured.slice(0, 4).map((provider) => (
              <Link
                key={provider.id}
                href={`/providers/${provider.id}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden block bg-[#f3ece9] cursor-pointer"
              >
                {/* Result image — fills the full card */}
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

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/0" />

                {/* Top — category tag + rating */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  {provider.category && (
                    <span className="bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      {provider.category === 'NAILS' ? 'Nails' : provider.category === 'LASHES' ? 'Lashes' : provider.category}
                    </span>
                  )}
                  <div className="ml-auto bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="h-3 w-3 fill-[#E96B56] text-[#E96B56]" />
                    <span className="text-xs font-bold text-[#1A1A1A]">
                      {provider.rating > 0 ? provider.rating.toFixed(1) : '5.0'}
                    </span>
                  </div>
                </div>

                {/* Bottom — style name is hero, artist is footnote */}
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
            <Link href="/search" className="text-sm font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors">
              See all looks →
            </Link>
          </div>
        </section>
      )}

    </div>
  )
}
