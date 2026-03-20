'use client'

import Link from 'next/link'
import { Star, Heart } from 'lucide-react'
import { AiText } from '../AiText'
import { getTierColor } from '@/lib/utils'
import type { FavouriteTalent } from '@/types/dashboard'

interface Props {
  talents: FavouriteTalent[]
  talentRecommendation: string | null | undefined
  aiLoading: boolean
}

export function FavouriteTalents({ talents, talentRecommendation, aiLoading }: Props) {
  if (talents.length === 0) {
    return (
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        <h2 className="mb-4 text-lg font-bold text-[#1A1A1A]">Your Go-To Artists</h2>
        <div className="py-6 text-center">
          <Heart className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
          <p className="text-body-compact text-[#717171]">Book your first appointment to start building your favourites</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Your Go-To Artists</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {talents.slice(0, 6).map(talent => (
          <div key={talent.id} className="flex items-center gap-3 rounded-xl bg-[#f9f2ef] p-3">
            {/* Avatar */}
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-sm font-bold text-white">
              {talent.name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-body-compact font-semibold text-[#1A1A1A]">{talent.name}</p>
                <span
                  className="rounded-full px-1.5 py-0.5 text-micro font-bold"
                  style={{ backgroundColor: `${getTierColor(talent.tier)}15`, color: getTierColor(talent.tier) }}
                >
                  {talent.tier}
                </span>
              </div>
              <p className="text-label text-[#717171]">
                {talent.bookingCount} appointment{talent.bookingCount !== 1 ? 's' : ''} · {talent.topService}
              </p>
              {talent.averageRating > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.round(talent.averageRating) }).map((_, i) => (
                    <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
            </div>

            <Link href={`/book/${talent.id}`}>
              <button className="whitespace-nowrap rounded-lg bg-[#E96B56] px-3 py-1.5 text-label font-semibold text-white transition-colors hover:bg-[#a63a29]">
                Book Again
              </button>
            </Link>
          </div>
        ))}
      </div>

      <AiText text={talentRecommendation} loading={aiLoading} className="mt-3 text-body-compact text-[#717171]" skeletonWidth="w-full" />
    </div>
  )
}
