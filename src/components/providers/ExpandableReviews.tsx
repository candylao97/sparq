'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ReviewCard } from './ReviewCard'
import type { ReviewWithCustomer } from '@/types'

interface Props {
  reviews: ReviewWithCustomer[]
  initialCount?: number
}

export function ExpandableReviews({ reviews, initialCount = 3 }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (reviews.length === 0) {
    return (
      <div className="bg-[#f9f2ef] p-8 rounded-xl text-center">
        <p className="text-[#717171]">No reviews yet — book a session and be the first to share how it went.</p>
      </div>
    )
  }

  const visible = expanded ? reviews : reviews.slice(0, initialCount)
  const hasMore = reviews.length > initialCount

  return (
    <div className="space-y-6">
      {visible.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full py-4 bg-[#e8e1de] text-[#1A1A1A] font-bold text-sm rounded-full transition-all hover:bg-[#dec0ba] flex items-center justify-center gap-2"
        >
          {expanded ? (
            <>
              Show fewer reviews
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show all {reviews.length} reviews
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
