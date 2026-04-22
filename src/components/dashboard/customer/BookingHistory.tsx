'use client'

import Link from 'next/link'
import { Star, RotateCcw } from 'lucide-react'
import { BookingStatusPill } from '@/components/providers/BookingStatusPill'
import { AiText } from '../AiText'
import { formatDate } from '@/lib/utils'
import type { CustomerBooking } from '@/types/dashboard'

interface Props {
  pastBookings: CustomerBooking[]
  unreviewedBookings: CustomerBooking[]
  bookingNarrative: string | null | undefined
  aiLoading: boolean
}

export function BookingHistory({ pastBookings, unreviewedBookings, bookingNarrative, aiLoading }: Props) {
  const unreviewedIds = new Set(unreviewedBookings.map(b => b.id))

  if (pastBookings.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Book again</h2>
        <AiText text={bookingNarrative} loading={aiLoading} className="text-xs text-[#717171]" skeletonWidth="w-48" />
      </div>

      <div className="space-y-2">
        {pastBookings.slice(0, 6).map(booking => {
          const isUnreviewed = unreviewedIds.has(booking.id)
          const isCompleted = booking.status === 'COMPLETED'

          return (
            <div
              key={booking.id}
              className={`flex items-center gap-4 rounded-xl p-3.5 ${
                isUnreviewed ? 'border border-amber-200 bg-amber-50/30' : 'bg-[#f9f2ef]'
              }`}
            >
              {/* Artist avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-sm font-bold text-white">
                {booking.provider.name.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1A1A1A]">{booking.service.title}</p>
                <p className="text-xs text-[#717171]">
                  {booking.provider.name} · {formatDate(booking.date)}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {isUnreviewed && (
                  <Link href={`/review/${booking.id}`}>
                    <button className="flex items-center gap-1 rounded-lg border border-[#E96B56] px-2.5 py-1.5 text-xs font-semibold text-[#E96B56] transition-colors hover:bg-[#E96B56] hover:text-white">
                      <Star className="h-3 w-3" /> Review
                    </button>
                  </Link>
                )}
                {isCompleted && (
                  <Link href={`/book/${booking.provider.id}`}>
                    <button className="flex items-center gap-1.5 rounded-lg bg-[#E96B56] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#d45a45]">
                      <RotateCcw className="h-3 w-3" /> Book again
                    </button>
                  </Link>
                )}
                {!isCompleted && <BookingStatusPill status={booking.status} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
