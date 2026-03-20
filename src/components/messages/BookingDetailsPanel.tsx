'use client'

import Link from 'next/link'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { BookingStatusPill } from '@/components/providers/BookingStatusPill'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatTime, formatCurrency, getCategoryLabel, getLocationLabel } from '@/lib/utils'
import type { BookingDetailsForMessages } from '@/types/messages'

interface Props {
  booking: BookingDetailsForMessages | null
  currentUserId: string
  loading: boolean
}

export function BookingDetailsPanel({ booking, currentUserId, loading }: Props) {
  if (loading || !booking) {
    return (
      <div className="hidden h-full w-80 flex-shrink-0 border-l border-[#1A1A1A]/5 bg-[#f9f2ef] lg:block">
        <div className="px-8 py-6">
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="px-8">
          <div className="space-y-4 rounded-xl bg-white p-6">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const isCustomer = booking.customer.id === currentUserId
  const otherParty = isCustomer ? booking.provider : booking.customer

  return (
    <div className="hidden h-full w-80 flex-shrink-0 flex-col border-l border-[#1A1A1A]/5 bg-[#f9f2ef] lg:flex">
      <div className="px-8 py-6">
        <h2 className="font-headline text-xl font-bold text-[#1A1A1A]">Service Details</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-8">
        <div className="rounded-xl bg-white p-6 shadow-sm mb-6">
          {/* Category badge */}
          <span className="inline-block rounded-full bg-[#ffb4a7] text-[#7a433a] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {getCategoryLabel(booking.service.category)}
          </span>

          {/* Service title */}
          <h4 className="font-bold text-sm mt-3 mb-1 text-[#1A1A1A]">{booking.service.title}</h4>
          <p className="text-xs text-[#717171] mb-4">
            {booking.service.duration} min · All included
          </p>

          {/* Price + status */}
          <div className="flex justify-between items-center pt-4 border-t border-[#1A1A1A]/5">
            <span className="text-lg font-bold text-[#E96B56]">{formatCurrency(booking.totalPrice)}</span>
            <BookingStatusPill status={booking.status} />
          </div>
        </div>

        <div className="space-y-6">
          {/* Other party */}
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-3">
              {isCustomer ? 'Your Artist' : 'Client'}
            </h5>
            <div className="flex items-center gap-3 rounded-xl bg-white p-3">
              <Avatar src={otherParty.image} name={otherParty.name} size="sm" />
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{otherParty.name}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-3">Schedule</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-[#717171]">
                <Calendar className="h-4 w-4 text-[#E96B56]" />
                {formatDate(booking.date)}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-[#717171]">
                <Clock className="h-4 w-4 text-[#E96B56]" />
                {formatTime(booking.time)} · {booking.service.duration} min
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-3">Location</h5>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[#E96B56] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#717171] leading-relaxed">{getLocationLabel(booking.locationType)}</p>
            </div>
          </div>

          {/* View full booking */}
          <Link
            href="/dashboard/customer"
            className="block text-center text-xs font-bold text-[#E96B56] transition-colors hover:underline underline-offset-4"
          >
            View full booking
          </Link>
        </div>
      </div>
    </div>
  )
}
