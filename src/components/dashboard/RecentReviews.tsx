'use client'

import { useState } from 'react'
import { Star, MessageSquare, Quote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import { ReviewReplyModal } from './ReviewReplyModal'
import type { DashboardReview } from '@/types/dashboard'

interface Props {
  reviews: DashboardReview[]
  unresponded: DashboardReview[]
  aiSummary: string | null | undefined
  onRefresh: () => void
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-[#e8e1de] text-[#e8e1de]'}`}
        />
      ))}
    </div>
  )
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

  const unrepliedCount = uniqueReviews.filter(r => !r.providerResponse).length

  return (
    <>
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Recent reviews</h2>
            {unrepliedCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E96B56] px-1.5 text-label font-bold text-white">
                {unrepliedCount}
              </span>
            )}
          </div>
          {reviews.length > 0 && (
            <span className="text-xs font-semibold text-[#E96B56] transition-colors hover:text-[#a63a29]">
              View all →
            </span>
          )}
        </div>

        {/* AI Review Summary */}
        {aiSummary && (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Quote className="h-3.5 w-3.5 text-[#E96B56]" />
              <span className="text-label font-semibold uppercase tracking-wider text-[#E96B56]">What clients say</span>
            </div>
            <p className="text-body-compact italic leading-relaxed text-[#1A1A1A]">{aiSummary}</p>
          </div>
        )}

        {uniqueReviews.length > 0 ? (
          <div className="divide-y divide-[#f0e8e4]">
            {uniqueReviews.map(review => {
              const needsReply = !review.providerResponse
              return (
                <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                  {/* Reviewer row */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={review.customer.name} src={review.customer.image} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-body-compact font-semibold text-[#1A1A1A]">
                            {review.customer.name}
                          </p>
                          {needsReply && (
                            <span className="rounded-full bg-[#E96B56]/10 px-1.5 py-0.5 text-micro font-semibold text-[#E96B56]">
                              Needs reply
                            </span>
                          )}
                        </div>
                        {review.booking?.service && (
                          <p className="text-label text-[#717171]">{review.booking.service.title}</p>
                        )}
                      </div>
                    </div>
                    <StarRow rating={review.rating} />
                  </div>

                  {review.text && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-[#717171]">
                      {review.text}
                    </p>
                  )}

                  {review.providerResponse && (
                    <div className="mt-2 rounded-lg border-l-2 border-[#E96B56] bg-[#f9f2ef] px-3 py-2">
                      <p className="text-label font-semibold text-[#1A1A1A]">Your reply</p>
                      <p className="text-label text-[#717171]">{review.providerResponse}</p>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
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
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9f2ef]">
              <Star className="h-6 w-6 text-[#e8e1de]" />
            </div>
            <p className="text-body-compact font-medium text-[#717171]">No reviews yet</p>
            <p className="mt-1 text-label text-[#717171]">They&apos;ll appear here after your first completed booking</p>
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
