'use client'

import { useState } from 'react'
import Link from 'next/link'
// Direct imports bypass Next.js barrel optimizer (avoids "Map.default is not a constructor" bug)
import Star from 'lucide-react/dist/esm/icons/star'
import Home from 'lucide-react/dist/esm/icons/home'
import Building2 from 'lucide-react/dist/esm/icons/building-2'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import MapIcon from 'lucide-react/dist/esm/icons/map'
import { DashboardNearbyMap } from './DashboardNearbyMap'
import type { FavouriteTalent, CustomerBooking } from '@/types/dashboard'

// ── Types ──────────────────────────────────────────────────────────

interface CardItem {
  id: string
  name: string
  topService: string
  suburb: string | null
  rating: number
  minPrice: number
  bookingCount: number
  offerAtHome: boolean
  offerAtStudio: boolean
}

type Filter = 'nearby' | 'favourite' | 'similar'

// ── Shared image helpers ───────────────────────────────────────────

const NAIL_IMAGES = [
  'https://images.unsplash.com/photo-1604655855317-b81ed9b3c46c',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b',
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371',
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067',
]
const LASH_IMAGES = [
  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b',
  'https://images.unsplash.com/photo-1639629509821-c54cdd984227',
  'https://images.unsplash.com/photo-1674049406467-824ea37c7184',
]
const BROW_IMAGES = [
  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b',
  'https://images.unsplash.com/photo-1639629509821-c54cdd984227',
]

function getServiceImage(service: string, id: string, size = 'w=480&h=360') {
  const s = service.toLowerCase()
  const pool = /lash/i.test(s) ? LASH_IMAGES : /brow/i.test(s) ? BROW_IMAGES : NAIL_IMAGES
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return `${pool[hash % pool.length]}?auto=format&fit=crop&${size}&q=80`
}

const REASON_TAGS = ['Higher rated', 'Closer to you', 'Better price', 'Popular this week']

function getReasonTag(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return REASON_TAGS[hash % REASON_TAGS.length]
}

function getNextAvailability(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const daysOut = (hash % 4) + 1
  const target = new Date()
  target.setDate(target.getDate() + daysOut)
  return target.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function modeLabel(atHome: boolean, atStudio: boolean) {
  if (atHome && atStudio) return 'Home & studio'
  if (atHome) return 'At home'
  return 'Studio'
}

// ── Artist Card ────────────────────────────────────────────────────

function ArtistCard({ item, showReasonTag, layout = 'scroll' }: { item: CardItem; showReasonTag?: boolean; layout?: 'scroll' | 'grid' }) {
  const avail = getNextAvailability(item.id)
  const reasonTag = getReasonTag(item.id)

  return (
    <div className={`group ${layout === 'grid' ? 'w-full' : 'w-[210px] flex-shrink-0 sm:w-[230px]'}`}>
      <div
        className="overflow-hidden rounded-2xl bg-white transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)]"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Image */}
        <Link href={`/providers/${item.id}`} className="block">
          <div className="relative overflow-hidden bg-[#f3ece9]" style={{ aspectRatio: '4/3' }}>
            <img
              src={getServiceImage(item.topService, item.id)}
              alt={item.topService}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {item.rating > 0 && (
              <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-semibold text-[#1A1A1A]">{item.rating.toFixed(1)}</span>
              </div>
            )}
            {showReasonTag && (
              <div className="absolute left-2 bottom-2">
                <span className="rounded-full bg-[#1A1A1A]/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                  {reasonTag}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-3 pt-2.5 pb-2">
            <p className="truncate text-[0.85rem] font-semibold text-[#1A1A1A] leading-snug">{item.name}</p>
            <p className="mt-0.5 truncate text-xs text-[#717171]">{item.topService}</p>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] text-[#717171]">
                {item.offerAtHome
                  ? <Home className="h-3 w-3 flex-shrink-0 text-[#717171]" />
                  : <Building2 className="h-3 w-3 flex-shrink-0 text-[#717171]" />}
                <span className="truncate max-w-[100px]">
                  {item.suburb || modeLabel(item.offerAtHome, item.offerAtStudio)}
                </span>
              </div>
              {item.minPrice > 0 && (
                <span className="text-[11px] font-semibold text-[#1A1A1A]">from ${item.minPrice}</span>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
              <span className="text-[11px] text-[#717171]">Avail. {avail}</span>
            </div>
          </div>
        </Link>

        {/* Footer CTA */}
        <div className="border-t border-[#f3ece9] px-3 py-2 flex items-center justify-between">
          <Link
            href={`/providers/${item.id}`}
            className="text-[11px] font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors"
          >
            View profile
          </Link>
          <Link
            href={`/book/${item.id}`}
            className="flex items-center gap-1 rounded-full bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#333] transition-colors"
          >
            Book <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Section ────────────────────────────────────────────────────────

function Section({
  title, subtitle, items, ctaLabel, ctaHref, emptyMessage, showReasonTags, layout = 'scroll',
}: {
  title: string
  subtitle?: string
  items: CardItem[]
  ctaLabel?: string
  ctaHref?: string
  emptyMessage?: string
  showReasonTags?: boolean
  layout?: 'scroll' | 'grid'
}) {
  if (items.length === 0 && !emptyMessage) return null

  return (
    <div className="mb-12">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[1rem] font-semibold text-[#1A1A1A]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#717171]">{subtitle}</p>}
        </div>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="flex items-center gap-1 text-xs font-medium text-[#717171] underline-offset-2 transition-colors hover:text-[#1A1A1A] hover:underline"
          >
            {ctaLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {items.length > 0 ? (
        layout === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map(item => (
              <ArtistCard key={item.id} item={item} showReasonTag={showReasonTags} layout="grid" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {items.map(item => (
              <ArtistCard key={item.id} item={item} showReasonTag={showReasonTags} layout="scroll" />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-[#e8e1de] py-8 text-center">
          <p className="mb-3 text-sm text-[#717171]">{emptyMessage}</p>
          <Link
            href="/search"
            className="inline-flex items-center gap-1 rounded-full border border-[#1A1A1A] px-4 py-2 text-xs font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
          >
            Browse artists
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────

interface Props {
  favouriteTalents: FavouriteTalent[]
  pastBookings: CustomerBooking[]
}

export function ArtistSections({ favouriteTalents, pastBookings }: Props) {
  const [filter, setFilter] = useState<Filter>('similar')

  // The hero already shows the most recent booking provider — exclude them from "Similar"
  const heroProviderId = pastBookings.length > 0
    ? [...pastBookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].provider.id
    : null

  // Build de-duped item pool from favourites + past bookings
  const allItems: CardItem[] = favouriteTalents.map(t => ({
    id: t.id,
    name: t.name,
    topService: t.topService,
    suburb: t.suburb,
    rating: t.averageRating,
    minPrice: t.minPrice,
    bookingCount: t.bookingCount,
    offerAtHome: t.offerAtHome,
    offerAtStudio: t.offerAtStudio,
  }))

  const seen = new Set(allItems.map(i => i.id))
  for (const b of pastBookings) {
    if (seen.has(b.provider.id)) continue
    seen.add(b.provider.id)
    allItems.push({
      id: b.provider.id,
      name: b.provider.name,
      topService: b.service.title,
      suburb: b.provider.suburb,
      rating: 0,
      minPrice: 0,
      bookingCount: 1,
      offerAtHome: true,
      offerAtStudio: false,
    })
  }

  // Similar artists: exclude hero's provider, sort by rating (better alternatives first)
  const similarItems = allItems
    .filter(i => i.id !== heroProviderId)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8)

  // Nearby: has suburb, sorted by rating
  const nearbyItems = allItems
    .filter(i => i.suburb)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8)

  // Favourite: booked 2+ times, sorted by visit count
  const favouriteItems = allItems
    .filter(i => i.bookingCount >= 2)
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 8)

  const tabs: { key: Filter; label: string }[] = [
    { key: 'similar',   label: 'Discover' },
    { key: 'nearby',    label: 'Nearby' },
    { key: 'favourite', label: 'Favourites' },
  ]

  return (
    <div>
      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`inline-flex flex-shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
              filter === t.key
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                : 'border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#c0b8b4]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Similar artists ── */}
      {filter === 'similar' && (
        <Section
          title="Discover new artists"
          subtitle="Find new artists near you"
          items={similarItems}
          ctaLabel="Browse all"
          ctaHref="/search"
          emptyMessage="Complete your first booking and we'll suggest artists near you."
          showReasonTags
          layout="grid"
        />
      )}

      {/* ── Nearby → map view ── */}
      {filter === 'nearby' && (
        <DashboardNearbyMap items={nearbyItems} />
      )}

      {/* ── Favourite ── */}
      {filter === 'favourite' && (
        <Section
          title="Your go-to artists"
          subtitle="Artists you keep coming back to — rebook in one tap"
          items={favouriteItems}
          ctaLabel="Browse all"
          ctaHref="/search"
          emptyMessage="Book an artist twice and they'll appear here."
        />
      )}

      {/* ── Empty state (zero history) ── */}
      {allItems.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-[#e8e1de] py-16 text-center">
          <p className="mb-1.5 text-base font-semibold text-[#1A1A1A]">Find your go-to artist</p>
          <p className="mb-6 text-sm text-[#717171]">Browse nail artists and lash techs near you.</p>
          <div className="flex justify-center gap-3">
            <Link href="/search?category=NAILS" className="rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a2a2a] transition-colors">
              Nail artists
            </Link>
            <Link href="/nearby" className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors">
              <MapIcon className="h-3.5 w-3.5" /> Map view
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
