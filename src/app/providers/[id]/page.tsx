/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  Star,
  ChevronLeft,
  Share2,
  Heart,
  Home,
  Building2,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { ExpandableReviews } from '@/components/providers/ExpandableReviews'
import { RepeatBookingBanner } from '@/components/providers/RepeatBookingBanner'
import { BookingBottomBar } from '@/components/providers/BookingBottomBar'
import { GalleryGrid } from '@/components/providers/GalleryGrid'
import { BookingCard } from '@/components/providers/BookingCard'
import { getCategoryLabel, formatCurrency } from '@/lib/utils'

async function getProviderData(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/providers/${id}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function ProviderProfilePage({ params }: { params: { id: string } }) {
  const data = await getProviderData(params.id)
  if (!data) notFound()

  const { profile, reviews, averageRating, reviewCount, aiSummary } = data

  const minPrice =
    profile.services.length > 0
      ? Math.min(...profile.services.map((s: any) => s.price))
      : null

  const specialty = profile.services[0]
    ? getCategoryLabel(profile.services[0].category)
    : 'Beauty artist'
  const location = [profile.suburb, profile.city].filter(Boolean).join(', ')
  const firstName = profile.user.name?.split(' ')[0] ?? 'this artist'

  // Featured service title — style-based headline
  const featuredTitle = profile.services[0]?.title || specialty
  const featuredDuration = profile.services[0]?.duration ?? null

  // Extra portfolio photos beyond what the gallery shows (top 5)
  const extraPhotos: any[] = profile.portfolio.slice(5)

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-28 lg:pb-16">

      {/* ─── Top nav ─── */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All artists
        </Link>
        <div className="flex items-center gap-1">
          <button className="inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] px-3 py-2 rounded-full hover:bg-[#f3ece9] transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button className="inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#E96B56] px-3 py-2 rounded-full hover:bg-[#f3ece9] transition-colors">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* ─── Photo gallery — visual-first ─── */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <GalleryGrid photos={profile.portfolio} name={profile.user.name || 'Artist'} />
      </div>

      {/* ─── Two-column layout ─── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr_352px] gap-x-14 items-start">

          {/* ══ Left column ══ */}
          <div>

            {/* ── 1. Service hero — style-first ── */}
            <div className="pb-7 border-b border-[#1A1A1A]/5">

              {/* Category breadcrumb */}
              <p className="section-label mb-3">{specialty}</p>

              {/* Style-based title — the "what" */}
              <h1 className="font-headline text-3xl md:text-[2.5rem] text-[#1A1A1A] leading-[1.1] mb-4">
                {featuredTitle}
              </h1>

              {/* Rating + bookings — social proof immediately visible */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-5">
                {reviewCount > 0 ? (
                  <a
                    href="#reviews"
                    className="flex items-center gap-1.5 hover:underline underline-offset-2"
                  >
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i <= Math.round(averageRating) ? 'fill-[#E96B56] text-[#E96B56]' : 'fill-[#e8e1de] text-[#e8e1de]'}`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-sm text-[#1A1A1A]">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-[#717171]">
                      ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
                    </span>
                  </a>
                ) : (
                  <span className="text-sm text-[#8A8A8A]">No reviews yet</span>
                )}
              </div>

              {/* Price + duration — decision anchors */}
              <div className="flex items-baseline gap-4 flex-wrap mb-4">
                {minPrice !== null && (
                  <span className="text-[2rem] font-bold text-[#1A1A1A] leading-none">
                    {formatCurrency(minPrice)}
                  </span>
                )}
                {featuredDuration && (
                  <span className="flex items-center gap-1.5 text-sm text-[#555]">
                    <Clock className="w-4 h-4 text-[#8A8A8A]" />
                    {featuredDuration} min
                  </span>
                )}
                {minPrice !== null && profile.services.length > 1 && (
                  <span className="text-sm text-[#8A8A8A]">
                    starting price · see all below
                  </span>
                )}
              </div>

              {/* Service mode tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {profile.offerAtHome && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#f3ece9] text-[#555] px-3 py-1.5 rounded-full">
                    <Home className="w-3 h-3" /> Artist comes to you
                  </span>
                )}
                {profile.offerAtStudio && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#f3ece9] text-[#555] px-3 py-1.5 rounded-full">
                    <Building2 className="w-3 h-3" /> Studio available
                  </span>
                )}
              </div>
            </div>

            {/* ── 2. Artist — compact, secondary ── */}
            <div className="py-6 border-b border-[#1A1A1A]/5">
              <div className="flex items-center gap-3">

                {/* Avatar */}
                <div className="w-11 h-11 rounded-full overflow-hidden relative flex-shrink-0 ring-2 ring-white shadow-sm bg-[#f3ece9]">
                  {profile.user.image ? (
                    <Image
                      src={profile.user.image}
                      alt={profile.user.name || 'Artist'}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-base text-[#e8e1de]">
                        {profile.user.name?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name + location */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-[#1A1A1A]">
                      {profile.user.name}
                    </p>
                    {profile.isVerified && (
                      <BadgeCheck
                        className="w-4 h-4 text-[#E96B56] flex-shrink-0"
                        aria-label="Verified artist"
                      />
                    )}
                  </div>
                  <p className="text-xs text-[#8A8A8A]">
                    {specialty}{location ? ` · ${location}` : ''}
                  </p>
                </div>

                {/* Message link */}
                <Link
                  href="/messages"
                  className="text-xs font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors flex-shrink-0 border border-[#E96B56]/30 px-3 py-1.5 rounded-full hover:bg-[#f9ede9]"
                >
                  Message
                </Link>
              </div>

              {/* Bio — truncated, artist detail is secondary */}
              {profile.bio && (
                <p className="text-sm text-[#555] leading-relaxed mt-3 line-clamp-3">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Repeat booking banner */}
            <RepeatBookingBanner
              providerId={profile.userId}
              providerFirstName={firstName}
            />

            {/* ── 3. Services — selectable booking cards ── */}
            {profile.services.length > 0 && (
              <div className="py-8 border-b border-[#1A1A1A]/5">
                <h2 className="font-headline text-xl text-[#1A1A1A] mb-5">
                  Services &amp; pricing
                </h2>
                <div className="space-y-3">
                  {profile.services.map((service: any) => (
                    <div
                      key={service.id}
                      className="group flex items-center gap-4 p-4 md:p-5 rounded-2xl border border-[#e8e1de] bg-white
                                 hover:border-[#E96B56]/35 hover:shadow-[0_2px_20px_rgba(233,107,86,0.07)] transition-all duration-300"
                    >
                      {/* Service info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm text-[#1A1A1A]">
                            {service.title}
                          </p>
                          <span className="text-[10px] text-[#8A8A8A] bg-[#f3ece9] px-2 py-0.5 rounded-full flex-shrink-0">
                            {getCategoryLabel(service.category)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {service.duration && (
                            <span className="text-xs text-[#8A8A8A] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {service.duration} min
                            </span>
                          )}
                          {service.description && (
                            <span className="text-xs text-[#8A8A8A] line-clamp-1 hidden sm:block">
                              {service.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price + CTA */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="font-bold text-[#1A1A1A] text-base">
                          {formatCurrency(service.price)}
                        </p>
                        <Link
                          href={`/book/${profile.id}`}
                          className="inline-flex items-center gap-1.5 bg-[#1A1A1A] text-white text-xs font-semibold px-4 py-2 rounded-full
                                     hover:bg-[#E96B56] transition-colors duration-200 whitespace-nowrap"
                        >
                          Book <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 4. Portfolio overflow ── */}
            {extraPhotos.length > 0 && (
              <div className="py-8 border-b border-[#1A1A1A]/5">
                <h2 className="font-headline text-xl text-[#1A1A1A] mb-4">
                  More from {firstName}
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {extraPhotos.map((photo: any) => (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-xl overflow-hidden relative"
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption || 'Portfolio photo'}
                        fill
                        className="object-cover hover:opacity-90 transition-opacity"
                        sizes="(max-width: 1024px) 33vw, 180px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 5. Reviews ── */}
            <div id="reviews" className="py-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline text-xl text-[#1A1A1A]">Reviews</h2>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-[#E96B56] text-[#E96B56]" />
                    <span className="font-bold text-sm text-[#1A1A1A]">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-[#717171]">
                      · {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* AI summary */}
              {aiSummary && reviewCount > 0 && (
                <div className="bg-[#f9f2ef] rounded-xl p-4 mb-6">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E96B56] mb-2">
                    What clients say
                  </p>
                  <p className="text-sm text-[#555] leading-relaxed">{aiSummary}</p>
                </div>
              )}

              <ExpandableReviews reviews={reviews} initialCount={4} />
            </div>

          </div>

          {/* ══ Right column — sticky booking card ══ */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <BookingCard
                profileId={profile.id}
                minPrice={minPrice}
                services={profile.services}
                portfolio={profile.portfolio}
                averageRating={averageRating}
                reviewCount={reviewCount}
              />
              <p className="text-center text-xs text-[#717171] mt-4">
                Questions?{' '}
                <Link
                  href="/messages"
                  className="font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors"
                >
                  Message {firstName}
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Mobile sticky bottom bar ─── */}
      <BookingBottomBar
        profileId={profile.id}
        minPrice={minPrice}
        services={profile.services}
        portfolio={profile.portfolio}
      />

    </div>
  )
}
