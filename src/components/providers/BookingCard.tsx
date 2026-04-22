'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { CalendarCheck, BadgeCheck, RotateCcw, CreditCard, Shield, Star, Clock } from 'lucide-react'
import { SchedulingModal } from './SchedulingModal'
import { WaitlistButton } from './WaitlistButton'
import { formatCurrency } from '@/lib/utils'

interface BookingCardProps {
  profileId: string
  userId?: string
  minPrice: number | null
  services: any[]
  portfolio: any[]
  averageRating: number
  reviewCount: number
  featuredDuration?: number | null
  isVerified?: boolean
  hasAvailability?: boolean
}

export function BookingCard({
  profileId,
  userId,
  minPrice,
  services,
  portfolio,
  averageRating,
  reviewCount,
  featuredDuration,
  isVerified = false,
  hasAvailability = true,
}: BookingCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="rounded-2xl border border-[#e8e1de] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">

        {/* Header: rating + verified */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-2 px-6 py-3.5 bg-[#f9f2ef] border-b border-[#e8e1de]">
            <Star className="w-3.5 h-3.5 fill-[#1A1A1A] text-[#1A1A1A] flex-shrink-0" />
            <span className="font-bold text-sm text-[#1A1A1A]">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-[#717171]">· {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
            {isVerified && (
              <div className="flex items-center gap-1 ml-auto">
                <BadgeCheck className="w-3.5 h-3.5 text-[#E96B56]" />
                <span className="text-xs font-medium text-[#717171]">Verified</span>
              </div>
            )}
          </div>
        )}

        <div className="p-6">

          {/* ── Price ── */}
          <div className="mb-4">
            {minPrice !== null ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-headline text-3xl text-[#1A1A1A]">
                  {formatCurrency(minPrice)}
                </span>
                <span className="text-[#717171] text-sm">AUD</span>
                {featuredDuration && (
                  <span className="flex items-center gap-1 text-xs text-[#717171] ml-1">
                    <Clock className="w-3 h-3" />
                    {featuredDuration} min
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[#717171] text-sm">Price on enquiry</p>
            )}
            <p className="text-xs text-[#717171] mt-1">Starting from · Final price shown at checkout</p>
          </div>

          {/* ── Primary CTA ── */}
          {hasAvailability ? (
            <>
              <button
                onClick={() => setIsOpen(true)}
                className="w-full bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] transition-all
                           text-white font-semibold py-3.5 rounded-full text-sm flex items-center
                           justify-center gap-2 shadow-sm"
              >
                <CalendarCheck className="w-4 h-4" />
                Check availability
              </button>
              <p className="text-center text-xs text-[#717171] mt-2.5">
                You won&apos;t be charged yet
              </p>
            </>
          ) : userId ? (
            <div className="flex flex-col items-center gap-2">
              <WaitlistButton
                providerId={userId}
                reason="No upcoming availability — join to be notified when they open up"
              />
            </div>
          ) : (
            <div className="w-full bg-[#f3ece9] text-[#717171] font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 cursor-default">
              <CalendarCheck className="w-4 h-4" />
              Not currently available
            </div>
          )}

          {/* ── Trust signals ── */}
          <div className="mt-5 pt-5 border-t border-[#f3ece9] space-y-3">
            <div className="flex items-start gap-2.5">
              <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[#717171] leading-relaxed">
                <span className="font-semibold text-[#717171]">Public liability covered</span> — protected during every appointment
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[#717171] leading-relaxed">
                Free cancellation up to 24h before your appointment
              </span>
            </div>
            {isVerified && (
              <div className="flex items-start gap-2.5">
                <BadgeCheck className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-[#717171] leading-relaxed">
                  Verified artist — identity and work confirmed by Sparq
                </span>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <CreditCard className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[#717171] leading-relaxed">
                Secure payment — protected by Sparq Guarantee
              </span>
            </div>
          </div>
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
