'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Heart, Star, BadgeCheck, Calendar } from 'lucide-react'
import { formatCurrency, formatShortDate } from '@/lib/utils'
import type { ProviderCardData } from '@/types'

const TIER_BADGE: Record<string, { label: string; bg: string; text: string; tooltip: string } | null> = {
  ELITE:   { label: 'Sparq Elite',    bg: 'bg-[#1A1A1A]',   text: 'text-white',      tooltip: 'Top 1% of artists on Sparq — exceptional quality and reliability' },
  PRO:     { label: 'Sparq Pro',      bg: 'bg-[#E96B56]',   text: 'text-white',      tooltip: 'Consistently high ratings, fast responses, and 90%+ completion rate' },
  TRUSTED: { label: 'Top Rated',      bg: 'bg-[#f3ece9]',   text: 'text-[#a63a29]', tooltip: 'Verified artist with a strong track record of great service' },
  RISING:  null,
  NEWCOMER: null,
}

interface ProviderCardProps {
  provider: ProviderCardData
  initialSaved?: boolean
}

export function ProviderCard({ provider, initialSaved = false }: ProviderCardProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const next = !saved
    setSaved(next) // optimistic update
    try {
      const res = await fetch('/api/wishlists', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id }),
      })
      if (!res.ok && res.status === 401) {
        setSaved(!next) // revert if unauthenticated
      }
    } catch {
      setSaved(!next) // revert on network error
    } finally {
      setSaving(false)
    }
  }, [saved, saving, provider.id])
  const primaryService = provider.services[0]
  return (
    <Link href={`/providers/${provider.id}`} className="group block">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-[#f3ece9] overflow-hidden rounded-2xl mb-3 transition-shadow duration-500 group-hover:shadow-lg">
        {provider.portfolio[0] ? (
          <Image
            src={provider.portfolio[0].url}
            alt={provider.name || 'Artist'}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 bg-[#f3ece9] flex items-center justify-center">
            <span className="text-5xl font-light text-[#e8e1de]">{provider.name?.charAt(0) ?? 'A'}</span>
          </div>
        )}

        {/* UX-L5: Tier badge — accessible with role="status" + aria-label for screen readers */}
        {TIER_BADGE[provider.tier] && (() => {
          const badge = TIER_BADGE[provider.tier]!
          return (
            <span
              role="status"
              aria-label={badge.tooltip}
              title={badge.tooltip}
              className={`absolute top-3 left-3 z-10 ${badge.bg} ${badge.text} text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide shadow-sm`}
            >
              {badge.label}
            </span>
          )
        })()}

        {/* Heart — wired to wishlist API */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="absolute top-3 right-3 z-10 p-1.5 transition-all duration-300 active:scale-90 disabled:opacity-70"
          aria-label={saved ? 'Remove from saved' : 'Save artist'}
        >
          <Heart className={`w-5 h-5 drop-shadow-md transition-colors duration-300 ${saved ? 'fill-[#E96B56] text-[#E96B56]' : 'fill-black/20 text-white'}`} />
        </button>
      </div>

      {/* Info — artist name first, then location, then price */}
      <div className="space-y-1.5 px-0.5">
        {/* Row 1: Artist name + rating */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-[#1A1A1A] text-base leading-snug truncate">
            {provider.name}
          </p>
          {provider.reviewCount > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-[#1A1A1A] text-[#1A1A1A]" />
              <span className="text-sm font-semibold text-[#1A1A1A]">
                {provider.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-[#8A8A8A]">({provider.reviewCount})</span>
            </div>
          )}
        </div>

        {/* Row 2: Location */}
        <p className="text-[#717171] text-sm truncate">
          {[provider.suburb, provider.city].filter(Boolean).join(', ') || 'Australia'}
          {' · '}
          {provider.offerAtHome && provider.offerAtStudio ? 'Home & studio'
            : provider.offerAtHome ? 'Mobile' : 'Studio'}
        </p>

        {/* Row 3: Price + verified */}
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-sm text-[#1A1A1A]">
            {primaryService ? (
              <>
                <span className="text-[#8A8A8A] font-normal">From </span>
                <span className="font-semibold">{formatCurrency(primaryService.price)}</span>
                <span className="text-[#8A8A8A] font-normal"> / visit</span>
              </>
            ) : (
              'Price on enquiry'
            )}
          </p>
          {provider.isVerified && (
            <BadgeCheck className="w-4 h-4 text-[#E96B56] flex-shrink-0" />
          )}
        </div>

        {/* Social proof + response time */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {provider.monthlyBookings != null && provider.monthlyBookings > 0 && (
            <p className="text-[11px] text-[#717171]">
              {provider.monthlyBookings} {provider.monthlyBookings === 1 ? 'booking' : 'bookings'} this month
            </p>
          )}
          {/* MH-4: Response time badge with colour coding — green <2h, amber <12h, red otherwise */}
          {provider.responseTimeHours != null && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              provider.responseTimeHours < 2 ? 'bg-green-50 text-green-700' :
              provider.responseTimeHours < 12 ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {provider.responseTimeHours < 2 ? '⚡ Fast replies' :
               provider.responseTimeHours < 12 ? '~' + Math.round(provider.responseTimeHours) + 'h reply' :
               'Slow replies'}
            </span>
          )}
          {provider.services?.some((s: any) => s.instantBook) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              ⚡ Instant Book
            </span>
          )}
        </div>

        {/* UX-7: Next available date */}
        {provider.nextAvailableDate && (
          <div className="flex items-center gap-1 text-xs text-[#717171] mt-1">
            <Calendar className="w-3 h-3" />
            <span>Next: {formatShortDate(provider.nextAvailableDate)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
