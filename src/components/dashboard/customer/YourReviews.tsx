'use client'

import { Star, Quote } from 'lucide-react'
import { AiText } from '../AiText'
import { formatShortDate } from '@/lib/utils'

interface ReviewItem {
  id: string
  rating: number
  text: string | null
  providerResponse: string | null
  createdAt: string
  provider: { name: string; image: string | null }
  service: { title: string }
}

interface Props {
  reviews: ReviewItem[]
  unreviewedCount: number
  reviewPrompt: string | null | undefined
  aiLoading: boolean
}

export function YourReviews({ reviews, unreviewedCount, reviewPrompt, aiLoading }: Props) {
  if (reviews.length === 0 && unreviewedCount === 0) return null

  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Your reviews</h2>
        {reviews.length > 0 && (
          <span className="text-xs text-[#717171]">{reviews.length} review{reviews.length !== 1 ? 's' : ''} left</span>
        )}
      </div>

      {/* AI review prompt */}
      {(reviewPrompt || aiLoading) && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <Quote className="h-3.5 w-3.5 text-[#E96B56]" />
            <span className="text-label font-semibold uppercase tracking-wider text-[#E96B56]">Quick nudge</span>
          </div>
          <AiText text={reviewPrompt} loading={aiLoading} className="text-body-compact italic leading-relaxed text-[#1A1A1A]" skeletonWidth="w-full" />
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-0 divide-y divide-[#e8e1de]">
          {reviews.slice(0, 5).map(review => (
            <div key={review.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-body-compact font-semibold text-[#1A1A1A]">{review.provider.name}</p>
                  <span className="text-label text-[#717171]">· {review.service.title}</span>
                </div>
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </div>
              </div>
              {review.text && (
                <p className="line-clamp-2 text-xs leading-relaxed text-[#717171]">{review.text}</p>
              )}

              {review.providerResponse && (
                <div className="mt-2 rounded-lg border-l-2 border-[#E96B56] bg-[#f9f2ef] p-2">
                  <p className="text-label font-semibold text-[#1A1A1A]">Artist&apos;s reply</p>
                  <p className="text-label text-[#717171]">{review.providerResponse}</p>
                </div>
              )}

              <p className="mt-1.5 text-label text-[#717171]">{formatShortDate(review.createdAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Star className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
          <p className="text-body-compact text-[#717171]">You haven&apos;t left any reviews yet. A quick rating goes a long way for artists.</p>
        </div>
      )}
    </div>
  )
}
