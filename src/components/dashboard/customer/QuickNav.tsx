'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star, MapPin, ArrowRight } from 'lucide-react'
import type { FavouriteTalent, CustomerBooking } from '@/types/dashboard'

type Tab = 'browse' | 'nearby' | 'foryou' | 'favourites'

const TABS: { key: Tab; label: string }[] = [
  { key: 'browse', label: 'Your artists' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'foryou', label: 'For you' },
  { key: 'favourites', label: 'Favourites' },
]

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

interface Props {
  favouriteTalents: FavouriteTalent[]
  pastBookings: CustomerBooking[]
}

// Curated service images — deterministically picked per artist
const NAIL_IMAGES = [
  'https://images.unsplash.com/photo-1604655855317-b81ed9b3c46c',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b',
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371',
]
const LASH_IMAGES = [
  'https://images.unsplash.com/photo-1583001931096-959e9a1a6223',
  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b',
]

function getServiceImage(topService: string, id: string): string {
  const isLash = /lash/i.test(topService)
  const pool = isLash ? LASH_IMAGES : NAIL_IMAGES
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return `${pool[hash % pool.length]}?auto=format&fit=crop&w=480&h=360&q=80`
}

function modeLabel(atHome: boolean, atStudio: boolean) {
  if (atHome && atStudio) return 'Home & studio'
  if (atHome) return 'At home'
  return 'Studio'
}

function ArtistCard({ item }: { item: CardItem }) {
  return (
    <Link href={`/book/${item.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]">

        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f3ece9]">
          <img
            src={getServiceImage(item.topService, item.id)}
            alt={item.topService}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />

          {/* Rating pill — overlaid bottom-left */}
          {item.rating > 0 && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 shadow-sm backdrop-blur-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-semibold text-[#1A1A1A]">{item.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Price — overlaid bottom-right */}
          {item.minPrice > 0 && (
            <div className="absolute bottom-2.5 right-2.5 rounded-full bg-white/90 px-2.5 py-0.5 shadow-sm backdrop-blur-sm">
              <span className="text-[11px] font-semibold text-[#1A1A1A]">from ${item.minPrice}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3.5 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1A1A1A]">{item.name}</p>
              <p className="mt-0.5 truncate text-xs text-[#717171]">{item.topService}</p>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c8c0bb] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1A1A1A]" />
          </div>

          <div className="mt-2 flex items-center gap-1 text-[11px] text-[#717171]">
            {item.suburb && (
              <>
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>{item.suburb}</span>
                <span>·</span>
              </>
            )}
            <span>{modeLabel(item.offerAtHome, item.offerAtStudio)}</span>
            {item.bookingCount > 1 && (
              <>
                <span>·</span>
                <span className="font-medium text-[#1A1A1A]">{item.bookingCount}× booked</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function QuickNav({ favouriteTalents, pastBookings }: Props) {
  const [active, setActive] = useState<Tab>('browse')

  // Build deduplicated card list
  const seen = new Set<string>()
  const allItems: CardItem[] = []

  for (const t of favouriteTalents) {
    if (!seen.has(t.id)) {
      seen.add(t.id)
      allItems.push({
        id: t.id,
        name: t.name,
        topService: t.topService,
        suburb: t.suburb,
        rating: t.averageRating,
        minPrice: t.minPrice,
        bookingCount: t.bookingCount,
        offerAtHome: t.offerAtHome,
        offerAtStudio: t.offerAtStudio,
      })
    }
  }

  for (const b of pastBookings) {
    if (allItems.length >= 6) break
    if (!seen.has(b.provider.id)) {
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
  }

  const browseItems = [...allItems].sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 6)
  const highRated = allItems.filter(i => i.rating >= 4.0).sort((a, b) => b.rating - a.rating)
  const forYouItems = (highRated.length > 0 ? highRated : allItems).slice(0, 6)
  // Favourites — booked 2+ times, sorted by booking count desc
  const favouriteItems = [...allItems].filter(i => i.bookingCount >= 2).sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 6)

  return (
    <div>
      {/* Airbnb-style underline tabs */}
      <div className="mb-6 flex gap-6 overflow-x-auto border-b border-[#e8e1de] scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-shrink-0 -mb-px pb-3 text-sm font-medium transition-all duration-200 border-b-2 ${
              active === tab.key
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#717171] hover:text-[#1A1A1A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Your artists tab */}
      {active === 'browse' && (
        browseItems.length > 0 ? (
          <div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {browseItems.map(item => (
                <ArtistCard key={item.id} item={item} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/search" className="text-sm font-medium text-[#717171] underline-offset-2 hover:text-[#1A1A1A] hover:underline transition-colors">
                Explore all artists
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            message="Book your first appointment to build your artist list."
            cta="Browse artists"
            href="/search"
          />
        )
      )}

      {/* Nearby tab */}
      {active === 'nearby' && (
        <Link href="/nearby" className="group block">
          <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] transition-shadow duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            {/* Map preview placeholder */}
            <div className="h-44 w-full bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v11/static/144.9631,-37.8136,11,0/800x352?access_token=pk.placeholder')] bg-[#2a2520] bg-cover bg-center opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-lg font-semibold text-white">Artists near you</p>
              <p className="text-sm text-white/60">See who&apos;s available on a map</p>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition-all group-hover:gap-2.5">
                Open map
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Favourites tab */}
      {active === 'favourites' && (
        favouriteItems.length > 0 ? (
          <div>
            <p className="mb-4 text-xs text-[#717171]">Artists you keep coming back to</p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {favouriteItems.map(item => (
                <ArtistCard key={item.id} item={item} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/search" className="text-sm font-medium text-[#717171] underline-offset-2 hover:text-[#1A1A1A] hover:underline transition-colors">
                Find more artists
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            message="Book an artist more than once and they'll appear here."
            cta="Browse artists"
            href="/search"
          />
        )
      )}

      {/* For you tab */}
      {active === 'foryou' && (
        forYouItems.length > 0 ? (
          <div>
            <p className="mb-4 text-xs text-[#717171]">Based on your booking history</p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {forYouItems.map(item => (
                <ArtistCard key={item.id} item={item} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/search?sort=rating" className="text-sm font-medium text-[#717171] underline-offset-2 hover:text-[#1A1A1A] hover:underline transition-colors">
                Discover more artists
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            message="Book your first appointment to get personalised picks."
            cta="Find an artist"
            href="/search"
          />
        )
      )}
    </div>
  )
}

function EmptyState({ message, cta, href }: { message: string; cta: string; href: string }) {
  return (
    <div className="py-12 text-center">
      <p className="mb-5 text-sm text-[#717171]">{message}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
      >
        {cta}
      </Link>
    </div>
  )
}
