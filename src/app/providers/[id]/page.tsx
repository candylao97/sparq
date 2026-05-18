/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ShareSaveButtons } from '@/components/providers/ShareSaveButtons'
import { ProfileViewTracker } from '@/components/providers/ProfileViewTracker'
import { ProfileGallery } from '@/components/providers/profile/ProfileGallery'
import { ProfileHeader } from '@/components/providers/profile/ProfileHeader'
import {
  AboutSection,
  ServicesSection,
  PortfolioSection,
  ReviewsSection,
  LocationSection,
} from '@/components/providers/profile/ProfileSections'
import {
  ProfileBookingPanel,
  ProfileMobileCta,
} from '@/components/providers/profile/ProfileBookingPanel'

// ── Data (unchanged — ported from previous implementation) ──────────
async function getProviderData(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/providers/${id}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

function buildJsonLd(profile: any, providerId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sparq.com.au'
  const name = profile.businessName || profile.user?.name || 'Sparq Artist'
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/providers/${providerId}`,
    name,
    url: `${baseUrl}/providers/${providerId}`,
    image: profile.user?.image ?? undefined,
    description: profile.tagline ?? undefined,
    address: profile.suburb
      ? { '@type': 'PostalAddress', addressLocality: profile.suburb, addressRegion: profile.state ?? 'VIC', addressCountry: 'AU' }
      : undefined,
    priceRange:
      profile.services?.length > 0
        ? `$${Math.min(...profile.services.map((s: any) => s.price))}–$${Math.max(...profile.services.map((s: any) => s.price))}`
        : undefined,
  }
  if (profile.averageRating && profile.reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(profile.averageRating).toFixed(1),
      reviewCount: profile.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }
  return jsonLd
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await getProviderData(params.id)
  if (!data) return { title: 'Artist | Sparq' }
  const { profile } = data
  const name = profile.businessName || profile.user?.name || 'Artist'
  const location = profile.suburb || profile.city || 'Melbourne'
  return {
    title: `${name} — ${location} | Sparq`,
    description:
      profile.tagline?.slice(0, 155) ||
      `Book ${name} on Sparq. Verified Melbourne artist with real reviews.`,
    openGraph: {
      title: `${name} — ${location} | Sparq`,
      description: profile.tagline?.slice(0, 155) || `Book ${name} on Sparq.`,
      images: profile.user?.image ? [profile.user.image] : undefined,
      type: 'profile',
    },
  }
}

// ── Page ────────────────────────────────────────────────────────────
export default async function ProviderProfilePage({ params }: { params: { id: string } }) {
  const data = await getProviderData(params.id)
  if (!data) notFound()

  const { profile, reviews = [], averageRating = 0, reviewCount = 0 } = data
  const name: string = profile.user?.name || profile.businessName || 'Artist'
  const firstName = name.split(' ')[0]
  const services = profile.services ?? []
  const portfolio = profile.portfolio ?? []
  const featuredService = services[0]
  const sinceYear = profile.createdAt ? new Date(profile.createdAt).getFullYear() : null

  // Derived badges (no schema field — computed per design conventions)
  const badges: { label: string; variant: 'ink' | 'coral' | 'plain' }[] = []
  if (reviewCount >= 10 && averageRating >= 4.8) badges.push({ label: 'Top-rated', variant: 'ink' })
  if (reviewCount === 0) badges.push({ label: 'New', variant: 'coral' })
  if (profile.isFeatured) badges.push({ label: 'Featured', variant: 'coral' })
  if (profile.isVerified) badges.push({ label: 'Verified', variant: 'plain' })

  return (
    <div className="bg-white pb-0 text-sparq-ink">
      <ProfileViewTracker providerId={params.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(profile, params.id)) }} />

      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        {/* Back / share-save bar */}
        <div className="flex items-center justify-between gap-3 py-3.5">
          <Link href="/search" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#717171] hover:text-sparq-ink">
            <ChevronLeft className="h-3.5 w-3.5" />
            All artists
          </Link>
          <ShareSaveButtons providerName={name} providerId={profile.id} />
        </div>

        {/* Hero gallery */}
        <ProfileGallery photos={portfolio} totalCount={portfolio.length} name={name} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-0 py-6 lg:grid-cols-[1.7fr_1fr] lg:gap-12 lg:py-8">
          <div>
            <ProfileHeader
              name={name}
              tagline={profile.tagline}
              averageRating={averageRating}
              reviewCount={reviewCount}
              suburb={profile.suburb}
              city={profile.city}
              serviceRadius={profile.serviceRadius}
              badges={badges}
            />
            <AboutSection tagline={profile.tagline} sinceYear={sinceYear} />
            <ServicesSection services={services} providerProfileId={profile.id} />
            <PortfolioSection photos={portfolio} totalCount={portfolio.length} />
            <ReviewsSection
              reviews={reviews}
              averageRating={averageRating}
              reviewCount={reviewCount}
              providerProfileId={profile.id}
              artistFirstName={firstName}
            />
            <LocationSection suburb={profile.suburb} city={profile.city} serviceRadius={profile.serviceRadius} />
          </div>

          <ProfileBookingPanel
            providerProfileId={profile.id}
            service={featuredService}
            averageRating={averageRating}
            reviewCount={reviewCount}
          />
        </div>
      </div>

      <ProfileMobileCta providerProfileId={profile.id} service={featuredService} />
    </div>
  )
}
