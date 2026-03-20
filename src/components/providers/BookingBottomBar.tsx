'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { SchedulingModal } from './SchedulingModal'
import { formatCurrency } from '@/lib/utils'

interface BookingBottomBarProps {
  profileId: string
  minPrice: number | null
  services: any[]
  portfolio: any[]
}

export function BookingBottomBar({
  profileId,
  minPrice,
  services,
  portfolio,
}: BookingBottomBarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#e8e1de] z-50 lg:hidden">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {minPrice !== null && minPrice !== undefined ? (
              <>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  From {formatCurrency(minPrice)} AUD{' '}
                  <span className="font-normal text-[#717171]">/ visit</span>
                </p>
                <p className="text-xs text-[#E96B56] font-medium mt-0.5">Free cancellation up to 24h before</p>
              </>
            ) : (
              <p className="text-sm text-[#717171]">Price on enquiry</p>
            )}
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-[#E96B56] hover:bg-[#d45a45] active:scale-[.98] transition-all text-white font-semibold px-6 py-3 rounded-full text-sm flex-shrink-0 shadow-sm"
          >
            Book now
          </button>
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
