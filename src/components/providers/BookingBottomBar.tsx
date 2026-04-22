'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { SchedulingModal } from './SchedulingModal'
import { WaitlistButton } from './WaitlistButton'
import { formatCurrency } from '@/lib/utils'

interface BookingBottomBarProps {
  profileId: string
  userId?: string
  minPrice: number | null
  services: any[]
  portfolio: any[]
  featuredDuration?: number | null
  hasAvailability?: boolean
}

export function BookingBottomBar({
  profileId,
  userId,
  minPrice,
  services,
  portfolio,
  featuredDuration,
  hasAvailability = true,
}: BookingBottomBarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#e8e1de] z-50 lg:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

          {/* Left: price · duration · next available */}
          <div className="min-w-0">
            {minPrice !== null ? (
              <>
                <p className="text-sm font-bold text-[#1A1A1A] leading-snug">
                  {formatCurrency(minPrice)}
                  {featuredDuration && (
                    <span className="font-normal text-[#717171]"> · {featuredDuration} min</span>
                  )}
                </p>
                {/* UX-M6: Reflect availability status in the sub-line */}
                <p className="text-xs font-medium mt-0.5" style={{ color: hasAvailability ? '#E96B56' : '#717171' }}>
                  {hasAvailability ? 'Free cancellation up to 24h' : 'Not currently available'}
                </p>
              </>
            ) : (
              <p className="text-sm text-[#717171]">Price on enquiry</p>
            )}
          </div>

          {/* Right: CTA — waitlist button when no availability */}
          {hasAvailability ? (
            <button
              onClick={() => setIsOpen(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-[#E96B56] hover:bg-[#d45a45]
                         active:scale-[.98] transition-all text-white font-semibold px-5 py-3
                         rounded-full text-sm shadow-sm"
            >
              <CalendarCheck className="w-4 h-4" />
              Check availability
            </button>
          ) : userId ? (
            <WaitlistButton providerId={userId} />
          ) : (
            <div className="flex-shrink-0 inline-flex items-center gap-2 bg-[#f3ece9] text-[#717171]
                            font-semibold px-5 py-3 rounded-full text-sm cursor-default select-none">
              <CalendarCheck className="w-4 h-4" />
              Not available
            </div>
          )}
        </div>
      </div>

      <SchedulingModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        profileId={profileId}
        services={services}
        portfolio={portfolio}
      />
    </>
  )
}
