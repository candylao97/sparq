'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Heart, Star, BadgeCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ProviderCardData } from '@/types'

interface ProviderCardProps {
  provider: ProviderCardData
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const [saved, setSaved] = useState(false)
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

        {/* Heart */}
        <button
          onClick={e => { e.preventDefault(); setSaved(s => !s) }}
          className="absolute top-3 right-3 z-10 p-1.5 transition-all duration-300 active:scale-90"
          aria-label={saved ? 'Remove from saved' : 'Save'}
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
        <p className="text-[#555] text-sm truncate">
          {provider.suburb ? `${provider.suburb}, ${provider.city}` : provider.city}
          {' · '}
          {provider.offerAtHome && provider.offerAtStudio ? 'Home & studio'
            : provider.offerAtHome ? 'Mobile' : 'Studio'}
        </p>

        {/* Row 3: Price + verified */}
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-sm text-[#1A1A1A]">
            <span className="font-semibold">{primaryService ? formatCurrency(primaryService.price) : 'Price on enquiry'}</span>
            {primaryService && <span className="text-[#8A8A8A] font-normal"> / visit</span>}
          </p>
          {provider.isVerified && (
            <BadgeCheck className="w-4 h-4 text-[#E96B56] flex-shrink-0" />
          )}
        </div>
      </div>
    </Link>
  )
}
