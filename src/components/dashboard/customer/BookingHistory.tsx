'use client'

import Link from 'next/link'
import { Sparkles, Eye, Tag, Star, RotateCcw } from 'lucide-react'
import { BookingStatusPill } from '@/components/providers/BookingStatusPill'
import { AiText } from '../AiText'
import { formatDate, formatTime } from '@/lib/utils'
import type { CustomerBooking } from '@/types/dashboard'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  NAILS: Sparkles,
  LASHES: Eye,
}

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
        <h2 className="text-lg font-bold text-[#1A1A1A]">Booking History</h2>
        {pastBookings.length > 6 && (
          <span className="text-xs font-semibold text-[#E96B56]">View all →</span>
        )}
      </div>

      <AiText text={bookingNarrative} loading={aiLoading} className="mb-4 text-body-compact text-[#717171]" skeletonWidth="w-full" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {pastBookings.slice(0, 6).map(booking => {
          const Icon = CATEGORY_ICONS[booking.service.category] || Tag
          const isUnreviewed = unreviewedIds.has(booking.id)

          return (
            <div
              key={booking.id}
              className={`flex items-center gap-4 rounded-xl p-3 transition-shadow ${
                isUnreviewed
                  ? 'border border-amber-200 bg-amber-50/30'
                  : 'bg-[#f9f2ef]'
              }`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                booking.status === 'COMPLETED' ? 'bg-emerald-50' : 'bg-[#f3ece9]'
              }`}>
                <Icon className={`h-4.5 w-4.5 ${
                  booking.status === 'COMPLETED' ? 'text-emerald-600' : 'text-[#717171]'
                }`} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-body-compact font-semibold text-[#1A1A1A]">
                  {booking.service.title}
                  <span className="font-normal text-[#717171]"> · {booking.provider.name}</span>
                </p>
                <p className="text-label text-[#717171]">
                  {formatDate(booking.date)} · {formatTime(booking.time)}
                </p>
              </div>

              <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                <BookingStatusPill status={booking.status} />
                <div className="flex items-center gap-1.5">
                  {booking.status === 'COMPLETED' && (
                    <Link href={`/book/${booking.provider.id}`}>
                      <button className="flex items-center gap-1 rounded-lg border border-[#e8e1de] px-2.5 py-0.5 text-label font-semibold text-[#717171] transition-colors hover:border-gray-900 hover:bg-[#1A1A1A] hover:text-white">
                        <RotateCcw className="h-3 w-3" /> Book again
                      </button>
                    </Link>
                  )}
                  {isUnreviewed && (
                    <Link href={`/review/${booking.id}`}>
                      <button className="flex items-center gap-1 rounded-lg border border-[#E96B56] px-2.5 py-0.5 text-label font-semibold text-[#E96B56] transition-colors hover:bg-[#E96B56] hover:text-white">
                        <Star className="h-3 w-3" /> Review
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
