'use client'

import { useState } from 'react'
import { Star, MessageSquare, Quote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { ReviewReplyModal } from './ReviewReplyModal'
import type { DashboardReview } from '@/types/dashboard'

interface Props {
  reviews: DashboardReview[]
  unresponded: DashboardReview[]
  aiSummary: string | null | undefined
  onRefresh: () => void
}

export function RecentReviews({ reviews, unresponded, aiSummary, onRefresh }: Props) {
  const [replyTarget, setReplyTarget] = useState<DashboardReview | null>(null)

  // Show unresponded first, then recent
  const allReviews = [
    ...unresponded.filter(u => !reviews.find(r => r.id === u.id)),
    ...reviews,
  ].slice(0, 5)

  // Deduplicate
  const seen = new Set<string>()
  const uniqueReviews = allReviews.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  return (
    <>
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Recent Reviews</h2>
          {reviews.length > 0 && (
            <span className="text-xs font-semibold text-[#E96B56]">View all →</span>
          )}
        </div>

        {/* AI Review Summary */}
        {aiSummary && (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <div className="mb-1 flex items-center gap-1.5">
              <Quote className="h-3.5 w-3.5 text-[#E96B56]" />
              <span className="text-label font-semibold uppercase tracking-wider text-[#E96B56]">What clients say</span>
            </div>
            <p className="text-body-compact italic leading-relaxed text-[#1A1A1A]">{aiSummary}</p>
          </div>
        )}

        {uniqueReviews.length > 0 ? (
          <div className="space-y-0 divide-y divide-[#e8e1de]">
            {uniqueReviews.map(review => {
              const needsReply = !review.providerResponse
              return (
                <div key={review.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-body-compact font-semibold text-[#1A1A1A]">
                        {review.customer.name}
                      </p>
                      {review.booking?.service && (
                        <span className="text-label text-[#717171]">
                          · {review.booking.service.title}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>
                  {review.text && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-[#717171]">
                      {review.text}
                    </p>
                  )}

                  {review.providerResponse && (
                    <div className="mt-2 rounded-lg border-l-2 border-[#E96B56] bg-[#f9f2ef] p-2">
                      <p className="text-label font-semibold text-[#1A1A1A]">Your reply</p>
                      <p className="text-label text-[#717171]">{review.providerResponse}</p>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-label text-[#717171]">{formatDate(review.createdAt)}</p>
                    {needsReply && (
                      <Button variant="ghost" size="sm" onClick={() => setReplyTarget(review)}>
                        <MessageSquare className="mr-1 h-3 w-3" /> Reply
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Star className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
            <p className="text-body-compact text-[#717171]">No reviews yet — they&apos;ll show up here after your first booking</p>
          </div>
        )}
      </div>

      <ReviewReplyModal
        open={!!replyTarget}
        onClose={() => setReplyTarget(null)}
        review={replyTarget}
        onSubmitted={onRefresh}
      />
    </>
  )
}
