'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, MessageCircle } from 'lucide-react'
import { SchedulingModal } from './SchedulingModal'
import { WaitlistButton } from './WaitlistButton'
import { WishlistButton } from './WishlistButton'

interface Props {
  profileId: string
  userId?: string
  services: any[]
  portfolio: any[]
  hasAvailability?: boolean
}

export function HeroCTA({ profileId, userId, services, portfolio, hasAvailability = true }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {hasAvailability ? (
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 bg-[#E96B56] text-white font-semibold px-6 py-3 rounded-full
                       hover:bg-[#d45a45] active:scale-[.98] transition-all duration-200 shadow-sm text-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            Check availability
          </button>
        ) : userId ? (
          <div className="lg:hidden">
            <WaitlistButton providerId={userId} />
          </div>
        ) : (
          <div className="lg:hidden flex items-center gap-2 bg-[#f3ece9] text-[#717171] font-medium px-6 py-3 rounded-full text-sm cursor-default">
            <CalendarCheck className="w-4 h-4" />
            No upcoming availability
          </div>
        )}
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 border border-[#1A1A1A] text-[#1A1A1A] font-semibold
                     px-6 py-3 rounded-full hover:bg-[#1A1A1A] hover:text-white transition-all duration-200 text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Message artist
        </Link>
        <WishlistButton providerId={profileId} />
      </div>

      <SchedulingModal
        isOpen={open}
        onClose={() => setOpen(false)}
        profileId={profileId}
        services={services}
        portfolio={portfolio}
      />
    </>
  )
}
