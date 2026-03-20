import { StarRating } from '@/components/ui/StarRating'
import { Avatar } from '@/components/ui/Avatar'
import { BadgeCheck } from 'lucide-react'
import { formatShortDate } from '@/lib/utils'
import type { ReviewWithCustomer } from '@/types'

interface ReviewCardProps {
  review: ReviewWithCustomer
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#e8e1de] dark:border-[#1A1A1A]/20 p-5">
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={review.customer.image} name={review.customer.name} size="sm" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm text-[#1A1A1A] dark:text-white">{review.customer.name || 'Anonymous'}</p>
              {(review as unknown as { isVerifiedPurchase?: boolean }).isVerifiedPurchase && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                  <BadgeCheck className="h-3 w-3" />
                  Verified booking
                </span>
              )}
            </div>
            <StarRating rating={review.rating} size="sm" />
          </div>
          <p className="text-xs text-[#717171] mt-0.5">{formatShortDate(review.createdAt)}</p>
        </div>
      </div>
      {review.text && <p className="text-sm text-[#717171] dark:text-[#717171] leading-relaxed">{review.text}</p>}
      {review.providerResponse && (
        <div className="mt-3 pl-4 border-l-2 border-[#E96B56]">
          <p className="text-xs font-semibold text-[#E96B56] mb-1">Artist&apos;s reply</p>
          <p className="text-sm text-[#717171] dark:text-[#717171]">{review.providerResponse}</p>
        </div>
      )}
    </div>
  )
}
