'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { CalendarCheck, BadgeCheck, RotateCcw, CreditCard, Star } from 'lucide-react'
import { SchedulingModal } from './SchedulingModal'
import { formatCurrency } from '@/lib/utils'

interface BookingCardProps {
  profileId: string
  minPrice: number | null
  services: any[]
  portfolio: any[]
  averageRating: number
  reviewCount: number
}

export function BookingCard({
  profileId,
  minPrice,
  services,
  portfolio,
  averageRating,
  reviewCount,
}: BookingCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="rounded-2xl border border-[#e8e1de] bg-white shadow-sm overflow-hidden">

        {/* Rating bar */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-2 px-6 py-3.5 bg-[#f9f2ef] border-b border-[#e8e1de]">
            <Star className="w-4 h-4 fill-[#1A1A1A] text-[#1A1A1A] flex-shrink-0" />
            <span className="font-semibold text-sm text-[#1A1A1A]">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-[#717171]">· {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1 ml-auto">
              <BadgeCheck className="w-3.5 h-3.5 text-[#E96B56]" />
              <span className="text-xs text-[#717171]">Verified</span>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Pricing */}
          <div className="mb-5">
            {minPrice !== null ? (
              <div>
                <span className="font-headline text-3xl text-[#1A1A1A]">
                  {formatCurrency(minPrice)}
                </span>
                <span className="text-[#717171] text-sm ml-1.5">AUD / visit</span>
                <p className="text-xs text-[#717171] mt-0.5">Starting from · Final price shown at checkout</p>
              </div>
            ) : (
              <p className="text-[#717171] text-sm">Price on enquiry</p>
            )}
          </div>

          {/* Service list */}
          {services.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#717171] mb-2.5">
                Services offered
              </p>
              <div className="divide-y divide-[#f3ece9]">
                {services.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-[#1A1A1A] truncate pr-3">{s.title}</span>
                    <span className="text-sm font-semibold text-[#1A1A1A] flex-shrink-0">
                      {formatCurrency(s.price)}
                    </span>
                  </div>
                ))}
                {services.length > 5 && (
                  <p className="text-xs text-[#717171] pt-2.5">
                    +{services.length - 5} more service{services.length - 5 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => setIsOpen(true)}
            className="w-full bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] transition-all text-white font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            Check availability
          </button>

          <p className="text-center text-xs text-[#717171] mt-2.5">
            You won&apos;t be charged until you confirm
          </p>

          {/* Trust signals */}
          <div className="mt-5 pt-5 border-t border-[#f3ece9] space-y-3">
            <div className="flex items-start gap-2.5">
              <RotateCcw className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[#717171] leading-relaxed">
                Free cancellation up to 24h before your appointment
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <BadgeCheck className="w-3.5 h-3.5 text-[#E96B56] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[#717171] leading-relaxed">
                Verified artist — identity and work confirmed by Sparq
              </span>
            </div>
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
