'use client'

import { useState } from 'react'
import { Star, ChevronDown, ChevronUp, Flag } from 'lucide-react'
import { ReviewCard } from './ReviewCard'
import type { ReviewWithCustomer } from '@/types'

interface Props {
  reviews: ReviewWithCustomer[]
  initialCount?: number
  averageRating?: number
}

function RatingBreakdown({ reviews, average }: { reviews: ReviewWithCustomer[]; average: number }) {
  const total = reviews.length
  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length
    return { star, count, pct: total > 0 ? (count / total) * 100 : 0 }
  })

  return (
    <div className="flex items-center gap-6 p-5 rounded-2xl bg-[#f9f2ef] mb-6">
      {/* Big number */}
      <div className="text-center flex-shrink-0">
        <p className="text-[3rem] font-bold text-[#1A1A1A] leading-none">{average.toFixed(1)}</p>
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              className={`w-3 h-3 ${s <= Math.round(average) ? 'fill-[#E96B56] text-[#E96B56]' : 'fill-[#e8e1de] text-[#e8e1de]'}`}
            />
          ))}
        </div>
        <p className="text-[10px] text-[#717171] mt-1">{total} review{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Bar chart */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {distribution.map(({ star, pct, count }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-[11px] text-[#717171] w-3 flex-shrink-0">{star}</span>
            <div className="flex-1 h-1.5 bg-[#e8e1de] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E96B56] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-[#717171] w-4 text-right flex-shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

async function flagReview(reviewId: string) {
  if (!window.confirm('Report this review as inappropriate?')) return
  try {
    await fetch(`/api/reviews/${reviewId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  } catch {
    // fail silently — non-critical action
  }
}

export function ExpandableReviews({ reviews, initialCount = 3, averageRating }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [sortReviews, setSortReviews] = useState<'newest' | 'highest' | 'lowest'>('newest')

  if (reviews.length === 0) {
    return (
      <div className="bg-[#f9f2ef] p-8 rounded-xl text-center">
        <p className="text-[#717171]">No reviews yet — book a session and be the first to share how it went.</p>
      </div>
    )
  }

  const avg = averageRating ?? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortReviews === 'highest') return b.rating - a.rating
    if (sortReviews === 'lowest') return a.rating - b.rating
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const visible = expanded ? sortedReviews : sortedReviews.slice(0, initialCount)
  const hasMore = reviews.length > initialCount

  return (
    <div>
      <RatingBreakdown reviews={reviews} average={avg} />

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[#717171]">Sort:</span>
        {(['newest', 'highest', 'lowest'] as const).map(option => (
          <button
            key={option}
            onClick={() => setSortReviews(option)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              sortReviews === option
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-[#f3ece9] text-[#717171] hover:bg-[#e8e1de]'
            }`}
          >
            {option === 'newest' ? 'Newest' : option === 'highest' ? 'Highest rated' : 'Lowest rated'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visible.map(review => (
          <div key={review.id} className="relative group">
            <ReviewCard review={review} />
            <button
              type="button"
              onClick={() => flagReview(review.id)}
              title="Report this review"
              className="absolute top-3 right-3 p-1.5 rounded-full text-[#717171] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
              aria-label="Report review"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-5 py-3.5 border border-[#1A1A1A] text-[#1A1A1A] font-semibold text-sm
                     rounded-full transition-all hover:bg-[#1A1A1A] hover:text-white
                     flex items-center justify-center gap-2"
        >
          {expanded ? (
            <>Show fewer reviews <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>See all {reviews.length} reviews <ChevronDown className="h-4 w-4" /></>
          )}
        </button>
      )}
    </div>
  )
}
