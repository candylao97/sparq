'use client'

import Link from 'next/link'
import { Sparkles, Eye, Search, Tag } from 'lucide-react'
import { AiText } from '../AiText'
import { getCategoryLabel } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  NAILS: Sparkles,
  LASHES: Eye,
}

const ALL_CATEGORIES = ['NAILS', 'LASHES']

interface Props {
  categoriesBooked: string[]
  discoveryRecommendation: string | null | undefined
  aiLoading: boolean
}

export function DiscoveryRecommendations({ categoriesBooked, discoveryRecommendation, aiLoading }: Props) {
  const unbookedCategories = ALL_CATEGORIES.filter(c => !categoriesBooked.includes(c))

  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Discover More</h2>
        <Link href="/search" className="text-xs font-semibold text-[#E96B56] hover:underline">
          Explore all →
        </Link>
      </div>

      {/* AI recommendation */}
      {(discoveryRecommendation || aiLoading) && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#E96B56]" />
            <span className="text-label font-semibold uppercase tracking-wider text-[#E96B56]">Recommended for you</span>
          </div>
          <AiText text={discoveryRecommendation} loading={aiLoading} className="text-body-compact leading-relaxed text-[#1A1A1A]" skeletonWidth="w-full" />
        </div>
      )}

      {unbookedCategories.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {unbookedCategories.map(cat => {
            const Icon = CATEGORY_ICONS[cat] || Tag
            return (
              <Link
                key={cat}
                href={`/search?category=${cat}`}
                className="flex items-center gap-3 rounded-xl border border-[#e8e1de] bg-white p-3 transition-all hover:border-[#E96B56] hover:shadow-sm"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50">
                  <Icon className="h-4 w-4 text-[#E96B56]" />
                </div>
                <div>
                  <p className="text-body-compact font-semibold text-[#1A1A1A]">{getCategoryLabel(cat)}</p>
                  <p className="text-label text-[#717171]">Browse {getCategoryLabel(cat).toLowerCase()} artists</p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="py-4 text-center">
          <Search className="mx-auto mb-2 h-6 w-6 text-[#e8e1de]" />
          <p className="text-xs text-[#717171]">You&apos;ve explored all current categories. Check back as we grow!</p>
        </div>
      )}
    </div>
  )
}
