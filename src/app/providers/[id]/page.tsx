/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  Star,
  ChevronLeft,
  Home,
  Building2,
  Clock,
  Shield,
  Award,
  MapPin,
  AlertTriangle,
} from 'lucide-react'
import { ShareSaveButtons } from '@/components/providers/ShareSaveButtons'
import { ExpandableReviews }   from '@/components/providers/ExpandableReviews'
import { RepeatBookingBanner } from '@/components/providers/RepeatBookingBanner'
import { BookingBottomBar }    from '@/components/providers/BookingBottomBar'
import { GalleryGrid }         from '@/components/providers/GalleryGrid'
import { BookingCard }         from '@/components/providers/BookingCard'
import { ServiceSelector }     from '@/components/providers/ServiceSelector'
import { TrustBadges }         from '@/components/providers/TrustBadges'
import { HeroCTA }             from '@/components/providers/HeroCTA'
import { AvailabilityCalendar } from '@/components/providers/AvailabilityCalendar'
import { CancellationPolicyCard } from '@/components/providers/CancellationPolicyCard'
import { getCategoryLabel, formatCurrency } from '@/lib/utils'
import { ProfileViewTracker } from '@/components/providers/ProfileViewTracker'

// ── JSON-LD structured data ────────────────────────────────────────

function buildJsonLd(profile: any, providerId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sparq.com.au'
  const name = profile.businessName || profile.user?.name || 'Sparq Artist'
  const avgRating = profile.averageRating ?? null
  const reviewCount = profile.reviewCount ?? 0

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/providers/${providerId}`,
    name,
    url: `${baseUrl}/providers/${providerId}`,
    image: profile.user?.image ?? undefined,
    description: profile.tagline ?? undefined,
    address: profile.suburb
      ? {
          '@type': 'PostalAddress',
          addressLocality: profile.suburb,
          addressRegion: profile.state ?? 'NSW',
          addressCountry: 'AU',
        }
      : undefined,
    priceRange: profile.services?.length > 0
      ? `$${Math.min(...profile.services.map((s: any) => s.price))}–$${Math.max(...profile.services.map((s: any) => s.price))}`
      : undefined,
    hasOfferCatalog: profile.services?.length > 0
      ? {
          '@type': 'OfferCatalog',
          name: 'Services',
          itemListElement: profile.services.slice(0, 5).map((s: any) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: s.title },
            price: s.price,
            priceCurrency: 'AUD',
          })),
        }
      : undefined,
  }

  if (avgRating && reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return jsonLd
}

// ── Data fetching ──────────────────────────────────────────────────

async function getProviderData(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/providers/${id}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

// ── Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await getProviderData(params.id)
  if (!data) return { title: 'Artist | Sparq' }
  const { profile } = data
  const name = profile.businessName || profile.user?.name || 'Artist'
  const location = profile.suburb || profile.city || 'Australia'
  return {
    title: `${name} — Artist in ${location} | Sparq`,
    description: profile.tagline?.slice(0, 155) || `Book ${name} on Sparq. Verified artist with real reviews.`,
  }
}

// ── Page ──────────────────────────────────────────────────────────

export default async function ProviderProfilePage({ params }: { params: { id: string } }) {
  const data = await getProviderData(params.id)
  if (!data) notFound()

  const { profile, reviews, averageRating, reviewCount, recentRating, recentReviewCount = 0, aiSummary, hasUpcomingAvailability = true, nextAvailableDate = null } = data

  const minPrice =
    profile.services.length > 0
      ? Math.min(...profile.services.map((s: any) => s.price))
      : null

  const specialty = profile.services[0]
    ? getCategoryLabel(profile.services[0].category)
    : 'Beauty artist'
  const location  = [profile.suburb, profile.city].filter(Boolean).join(', ')
  const firstName = profile.user.name?.split(' ')[0] ?? 'this artist'

  const featuredTitle    = profile.services[0]?.title || specialty
  const featuredDuration = profile.services[0]?.duration ?? null

  const extraPhotos: any[] = profile.portfolio.slice(5)

  // Real years on Sparq (from profile creation date)
  const yearsOnPlatform = Math.max(
    1,
    new Date().getFullYear() - new Date(profile.createdAt).getFullYear()
  )

  // Specialty tags: unique category labels from services (max 4)
  const specialtyTags = Array.from(
    new Set<string>(
      profile.services.slice(0, 4).map((s: any) => getCategoryLabel(s.category) as string)
    )
  )

  return (
    <div className="min-h-screen bg-white pb-28 lg:pb-16">

      {/* ─── Track profile view (client-side, fires on mount) ─── */}
      <ProfileViewTracker providerId={params.id} />

      {/* ─── Structured data ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(profile, params.id)) }}
      />

      {/* ─── Top nav ─── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 pt-6 pb-4 flex items-center justify-between">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All artists
        </Link>
        <ShareSaveButtons
          providerName={profile.user.name ?? 'Artist'}
          providerId={profile.id}
        />
      </div>

      {/* ─── Photo gallery ─── */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20 mb-8">
        <GalleryGrid photos={profile.portfolio} name={profile.user.name || 'Artist'} />
      </div>

      {/* ─── Two-column layout ─── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20">
        <div className="grid lg:grid-cols-[1fr_400px] gap-x-16 items-start">

          {/* ══ Left column ══ */}
          <div>

            {/* ── 1. HERO — decision-first ── */}
            <div className="pb-8 border-b border-[#1A1A1A]/5">

              {/* Row: category */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171]">
                  {specialty}
                </p>
              </div>

              {/* H1 — the "what" */}
              <h1 className="font-headline text-3xl md:text-[2.5rem] text-[#1A1A1A] leading-[1.1] mb-4">
                {featuredTitle}
              </h1>

              {/* Rating + location */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mb-5">
                {reviewCount > 0 ? (
                  <a href="#reviews" className="flex items-center gap-1.5 hover:underline underline-offset-2">
                    <div className="flex gap-0.5" aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i <= Math.round(averageRating) ? 'fill-[#E96B56] text-[#E96B56]' : 'fill-[#e8e1de] text-[#e8e1de]'}`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-sm text-[#1A1A1A]">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-[#717171]">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                    {/* T&S-R2: Show recent rating if it differs significantly from all-time */}
                    {recentRating !== null && recentRating !== undefined && Math.abs(recentRating - averageRating) >= 0.3 && recentReviewCount >= 3 && (
                      <span
                        title="Rating from the last 90 days"
                        className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f3ece9] text-[#a63a29]"
                      >
                        {recentRating > averageRating ? '↑' : '↓'} {recentRating.toFixed(1)} recent
                      </span>
                    )}
                  </a>
                ) : (
                  <span className="text-sm text-[#717171]">New artist</span>
                )}
                {location && (
                  <span className="flex items-center gap-1 text-sm text-[#717171]">
                    <MapPin className="w-3.5 h-3.5" />
                    {location}
                  </span>
                )}
              </div>

              {/* Price + duration + NEXT AVAILABLE — the three conversion anchors */}
              <div className="flex items-baseline gap-4 flex-wrap mb-3">
                {minPrice !== null && (
                  <span className="text-[2rem] font-bold text-[#1A1A1A] leading-none">
                    from {formatCurrency(minPrice)}
                  </span>
                )}
                {featuredDuration && (
                  <span className="flex items-center gap-1.5 text-sm text-[#717171]">
                    <Clock className="w-4 h-4 text-[#717171]" />
                    {featuredDuration} min
                  </span>
                )}
                {nextAvailableDate && (() => {
                  const d = new Date(nextAvailableDate + 'T12:00:00')
                  const isToday = nextAvailableDate === new Date().toISOString().split('T')[0]
                  const isTomorrow = (() => {
                    const tom = new Date(); tom.setDate(tom.getDate() + 1)
                    return nextAvailableDate === tom.toISOString().split('T')[0]
                  })()
                  const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                  return (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Next: {label}
                    </span>
                  )
                })()}
              </div>

              {/* Trust signals row */}
              <div className="mb-5">
                <TrustBadges isVerified={profile.isVerified} />
              </div>

              {/* Service mode */}
              <div className="flex items-center gap-2 flex-wrap mb-6">
                {profile.offerAtHome && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#f3ece9] text-[#717171] px-3 py-1.5 rounded-full">
                    <Home className="w-3 h-3" /> Artist comes to you
                  </span>
                )}
                {profile.offerAtStudio && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#f3ece9] text-[#717171] px-3 py-1.5 rounded-full">
                    <Building2 className="w-3 h-3" /> Studio available
                  </span>
                )}
              </div>

              {/* PRIMARY + SECONDARY CTAs */}
              <HeroCTA
                profileId={profile.id}
                userId={profile.userId}
                services={profile.services}
                portfolio={profile.portfolio}
                hasAvailability={hasUpcomingAvailability}
              />
            </div>

            {/* ── 2. ARTIST — trust-driven, not descriptive ── */}
            <div className="py-6 border-b border-[#1A1A1A]/5">
              <div className="flex items-start gap-3">

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden relative flex-shrink-0 ring-2 ring-white shadow-sm bg-[#f3ece9]">
                  {profile.user.image ? (
                    <Image
                      src={profile.user.image}
                      alt={profile.user.name || 'Artist'}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-base text-[#e8e1de]">{profile.user.name?.charAt(0)}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-sm text-[#1A1A1A]">{profile.user.name}</p>
                    {profile.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-[#E96B56] flex-shrink-0" aria-label="Verified" />
                    )}
                  </div>
                  <p className="text-xs text-[#717171] mt-0.5">{specialty}{location ? ` · ${location}` : ''}</p>

                  {/* Trust stats */}
                  <div className="flex items-center gap-4 flex-wrap mt-2">
                    <span className="flex items-center gap-1 text-xs text-[#717171]">
                      <Award className="w-3.5 h-3.5 text-[#E96B56]" />
                      On Sparq {yearsOnPlatform}+ yr{yearsOnPlatform !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Specialty tags */}
                  {specialtyTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {specialtyTags.map(tag => (
                        <span key={tag} className="text-[11px] bg-[#f3ece9] text-[#717171] px-2.5 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message */}
                <Link
                  href={`/messages?providerId=${profile.userId}`}
                  className="flex-shrink-0 text-xs font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors border border-[#E96B56]/30 px-3 py-1.5 rounded-full hover:bg-[#f9f2ef]"
                >
                  Message
                </Link>
              </div>

            </div>

            {/* Repeat booking banner */}
            <RepeatBookingBanner
              providerId={profile.id}
              providerFirstName={firstName}
            />

            {/* ── 3. SERVICES — selectable booking cards ── */}
            <div className="py-8 border-b border-[#1A1A1A]/5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-headline text-xl text-[#1A1A1A]">Choose a service</h2>
                {profile.services.length > 0 && (
                  <span className="text-xs text-[#717171]">{profile.services.length} available</span>
                )}
              </div>
              {profile.services.length > 0 ? (
                <ServiceSelector
                  services={profile.services}
                  profileId={profile.id}
                  portfolio={profile.portfolio}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-[#e8e1de] bg-[#f9f2ef] px-6 py-8 text-center">
                  <p className="font-jakarta text-sm font-semibold text-[#1A1A1A]">No services listed yet</p>
                  <p className="mt-1 font-jakarta text-xs text-[#717171]">
                    This artist hasn&apos;t published any services. Check back soon or send them a message.
                  </p>
                </div>
              )}
            </div>

            {/* ── 3b. AVAILABILITY CALENDAR — AUDIT-004 ── */}
            {profile.services.length > 0 && (
              <AvailabilityCalendar
                providerId={profile.userId}
                defaultServiceId={profile.services[0]?.id}
                artistFirstName={firstName}
              />
            )}

            {/* ── 4. PUBLIC LIABILITY — trust anchor ── */}
            <div className="py-6 border-b border-[#1A1A1A]/5">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#f0fdf4] border border-green-100">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-green-900">Covered by public liability protection</p>
                  <p className="text-xs text-green-800/80 leading-relaxed mt-1">
                    Every Sparq appointment is covered in case of accidental injury or property damage during your service. You&apos;re protected from the moment your artist arrives.
                  </p>
                </div>
              </div>
            </div>

            {/* ── 4b. CANCELLATION POLICY — AUDIT-009 ── */}
            <CancellationPolicyCard
              policyType={profile.cancellationPolicyType}
              customText={profile.cancellationPolicy}
              artistFirstName={firstName}
            />

            {/* ── 5. Portfolio overflow ── */}
            {extraPhotos.length > 0 && (
              <div className="py-8 border-b border-[#1A1A1A]/5">
                <h2 className="font-headline text-xl text-[#1A1A1A] mb-4">More from {firstName}</h2>
                <div className="grid grid-cols-3 gap-2">
                  {extraPhotos.map((photo: any) => (
                    <div key={photo.id} className="aspect-square rounded-xl overflow-hidden relative">
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

            {/* ── 6. REVIEWS — decision accelerator ── */}
            <div id="reviews" className="py-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-headline text-xl text-[#1A1A1A]">
                  {reviewCount > 0 ? `What clients say` : 'Reviews'}
                </h2>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-[#E96B56] text-[#E96B56]" />
                    <span className="font-bold text-sm text-[#1A1A1A]">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-[#717171]">· {reviewCount}</span>
                  </div>
                )}
              </div>

              {/* AI summary */}
              {aiSummary && reviewCount > 0 && (
                <div className="bg-[#f9f2ef] rounded-xl p-4 mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E96B56] mb-2">
                    Summary
                  </p>
                  <p className="text-sm text-[#717171] leading-relaxed">{aiSummary}</p>
                </div>
              )}

              {/* Star breakdown */}
              {reviewCount > 0 && (() => {
                const starCounts = [5, 4, 3, 2, 1].map(star => ({
                  star,
                  count: reviews.filter((r: any) => r.rating === star).length,
                }))
                const maxCount = Math.max(...starCounts.map(s => s.count), 1)
                return (
                  <div className="mb-6 space-y-1.5">
                    {starCounts.map(({ star, count }) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-[#717171] w-4">{star}</span>
                        <Star className="w-3 h-3 fill-[#E96B56] text-[#E96B56] flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-[#f3ece9] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E96B56] rounded-full transition-all duration-500"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#717171] w-4 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}

              <ExpandableReviews
                reviews={reviews}
                initialCount={3}
                averageRating={averageRating}
              />
            </div>

          </div>

          {/* ══ Right column — sticky booking card ══ */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              {!profile.isVerified && (
                <div className="flex items-center gap-2 text-xs text-[#717171] bg-[#f9f2ef] rounded-lg px-3 py-2 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>This artist is pending identity verification</span>
                </div>
              )}
              <BookingCard
                profileId={profile.id}
                userId={profile.userId}
                minPrice={minPrice}
                services={profile.services}
                portfolio={profile.portfolio}
                averageRating={averageRating}
                reviewCount={reviewCount}
                featuredDuration={featuredDuration}
                isVerified={profile.isVerified}
                hasAvailability={hasUpcomingAvailability}
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
        userId={profile.userId}
        minPrice={minPrice}
        services={profile.services}
        portfolio={profile.portfolio}
        featuredDuration={featuredDuration}
        hasAvailability={hasUpcomingAvailability}
      />

    </div>
  )
}
