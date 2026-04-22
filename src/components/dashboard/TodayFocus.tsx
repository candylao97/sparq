'use client'

import Link from 'next/link'
import { MapPin, Home, Star } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency, formatTime } from '@/lib/utils'
import type { TodayBooking } from '@/types/dashboard'

interface Props {
  bookings: TodayBooking[]
}

const LOCATION_LABEL: Record<string, string> = {
  AT_HOME: 'Mobile',
  STUDIO: 'Studio',
  BOTH: 'Mobile',
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function TodayFocus({ bookings }: Props) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#717171]">Today</p>
        <p className="text-xs text-[#717171]">{getTodayLabel()}</p>
      </div>

      {bookings.length > 0 ? (
        <div className="divide-y divide-[#f5ede9] overflow-hidden rounded-2xl border border-[#f0e8e4] bg-white">
          {bookings.map(booking => {
            const isAtHome = booking.locationType === 'AT_HOME'
            return (
              <div key={booking.id} className="flex items-center gap-4 px-5 py-4">
                {/* Time */}
                <div className="w-14 flex-shrink-0 text-center">
                  <p className="text-sm font-bold text-[#1A1A1A]">{formatTime(booking.time)}</p>
                  <p className="text-label text-[#717171]">
                    {booking.service.duration}m
                  </p>
                </div>

                {/* Divider */}
                <div className="h-10 w-px bg-[#f0e8e4]" />

                {/* Booking details */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A1A]">
                    {booking.service.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#717171]">
                    <span>{booking.customer.name}</span>
                    {booking.repeatFanCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[#E96B56]">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Repeat
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-[#717171]">
                    {isAtHome ? (
                      <Home className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {isAtHome
                        ? booking.address || 'Client will provide address'
                        : LOCATION_LABEL[booking.locationType] || booking.locationType}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(booking.totalPrice)}</p>
                </div>

                {/* Avatar */}
                <Avatar
                  src={booking.customer.image}
                  name={booking.customer.name}
                  size="sm"
                  className="flex-shrink-0"
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#f0e8e4] bg-white px-6 py-8 text-center">
          <p className="text-base font-semibold text-[#1A1A1A]">Nothing scheduled today</p>
          <p className="mt-1 text-sm text-[#717171]">
            Your profile is live — the more you promote it, the more bookings you get.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/provider/availability"
              className="rounded-xl border border-[#e8e1de] px-4 py-2 text-xs font-semibold text-[#1A1A1A] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]"
            >
              Update availability
            </Link>
            <Link
              href="/dashboard/provider/bookings"
              className="rounded-xl bg-[#E96B56] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a63a29]"
            >
              View all bookings
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
