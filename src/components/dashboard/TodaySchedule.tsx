'use client'

import { useState } from 'react'
import { Calendar, MapPin, Clock, FileText } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatTime, getLocationLabel } from '@/lib/utils'
import { PrepBriefModal } from './PrepBriefModal'
import type { TodayBooking } from '@/types/dashboard'

interface Props {
  bookings: TodayBooking[]
}

export function TodaySchedule({ bookings }: Props) {
  const [briefTarget, setBriefTarget] = useState<TodayBooking | null>(null)
  const dateStr = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Today&apos;s schedule</h2>
            <p className="text-xs text-[#717171]">{dateStr}</p>
          </div>
          {bookings.length > 0 && (
            <span className="text-xs font-semibold text-[#E96B56]">
              {bookings.length} appointment{bookings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-0 divide-y divide-[#e8e1de]">
            {bookings.map(booking => {
              const locationLabel = getLocationLabel(booking.locationType)

              return (
                <div key={booking.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Time */}
                  <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-amber-50">
                    <span className="text-base font-bold leading-none text-[#E96B56]">
                      {formatTime(booking.time)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1A1A1A]">{booking.service.title}</p>
                    <div className="flex items-center gap-2 text-xs text-[#717171]">
                      <Avatar name={booking.customer.name} src={booking.customer.image} size="xs" />
                      <span>{booking.customer.name}</span>
                      <span className="text-[#717171]">·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {booking.service.duration} mins
                      </span>
                      <span className="text-[#717171]">·</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {locationLabel}
                      </span>
                    </div>
                    {booking.notes && (
                      <p className="mt-0.5 truncate text-label italic text-[#717171]">
                        &ldquo;{booking.notes}&rdquo;
                      </p>
                    )}
                    {booking.repeatFanCount > 1 && (
                      <Badge variant="info" size="sm" className="mt-1">
                        Returning client · {booking.repeatFanCount} bookings
                      </Badge>
                    )}
                  </div>

                  {/* Prep Brief button */}
                  <Button variant="ghost" size="sm" onClick={() => setBriefTarget(booking)}>
                    <FileText className="mr-1 h-3.5 w-3.5" /> Prep
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9f2ef]">
              <Calendar className="h-6 w-6 text-[#e8e1de]" />
            </div>
            <p className="text-body-compact font-medium text-[#717171]">No appointments today</p>
            <p className="mt-1 text-label text-[#717171]">Use this time to grow your bookings</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <a
                href="/dashboard/provider/availability"
                className="rounded-xl border border-[#e8e1de] bg-white px-3 py-2 text-xs font-semibold text-[#1A1A1A] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]"
              >
                Update availability
              </a>
              <a
                href="/dashboard/provider/services"
                className="rounded-xl bg-[#E96B56] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a63a29]"
              >
                Review services
              </a>
            </div>
          </div>
        )}
      </div>

      <PrepBriefModal
        open={!!briefTarget}
        onClose={() => setBriefTarget(null)}
        booking={briefTarget}
      />
    </>
  )
}
