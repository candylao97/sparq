'use client'

import Link from 'next/link'
import { Sparkles, Eye, ChevronRight, Star } from 'lucide-react'
import type { FavouriteTalent } from '@/types/dashboard'

const CATEGORY_META: Record<string, { label: string; desc: string; Icon: typeof Sparkles }> = {
  NAILS: { label: 'Nail art', desc: 'Gels, acrylics, nail art & more', Icon: Sparkles },
  LASHES: { label: 'Lash extensions', desc: 'Classic, volume & hybrid sets', Icon: Eye },
}

interface Props {
  favouriteTalents: FavouriteTalent[]
  categoriesBooked: string[]
  discoveryRecommendation?: string | null
}

export function ForYou({ favouriteTalents, categoriesBooked }: Props) {
  const unbookedCategories = ['NAILS', 'LASHES'].filter(c => !categoriesBooked.includes(c))
  const artistCards = favouriteTalents.slice(0, 2)
  const totalCards = artistCards.length + unbookedCategories.length

  if (totalCards === 0) return null

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Recommended for you</h2>
        <Link href="/search" className="text-xs font-semibold text-[#E96B56] hover:underline">
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

        {/* Go-to artist cards — rebook */}
        {artistCards.map(talent => (
          <div key={talent.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-base font-bold text-white">
                {talent.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-[#1A1A1A]">{talent.name}</p>
                </div>
                <p className="truncate text-xs text-[#717171]">{talent.topService}</p>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-[#717171]">
                {talent.bookingCount} appointment{talent.bookingCount !== 1 ? 's' : ''} with you
              </p>
              {talent.averageRating > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.round(talent.averageRating) }).map((_, i) => (
                    <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto">
              <Link href={`/book/${talent.id}`}>
                <button className="w-full rounded-xl bg-[#E96B56] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#d45a45]">
                  Book again
                </button>
              </Link>
            </div>
          </div>
        ))}

        {/* Discovery cards — unbooked categories */}
        {unbookedCategories.map(cat => {
          const meta = CATEGORY_META[cat]
          if (!meta) return null
          const { label, desc, Icon } = meta
          return (
            <Link key={cat} href={`/search?category=${cat}`}>
              <div className="flex h-full flex-col rounded-2xl border border-dashed border-[#e8e1de] bg-[#f9f2ef] p-4 transition-all hover:border-[#E96B56] hover:bg-[#f3ece9]">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Icon className="h-5 w-5 text-[#E96B56]" />
                </div>
                <p className="mb-0.5 text-sm font-semibold text-[#1A1A1A]">{label}</p>
                <p className="mb-4 text-xs leading-relaxed text-[#717171]">{desc}</p>
                <div className="mt-auto flex items-center gap-0.5 text-xs font-semibold text-[#E96B56]">
                  Explore artists <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
