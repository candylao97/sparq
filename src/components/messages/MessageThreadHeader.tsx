'use client'

import { ArrowLeft } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { BookingStatusPill } from '@/components/providers/BookingStatusPill'

interface Props {
  otherParty: { id: string; name: string; image: string | null } | null
  bookingStatus: string | null
  onBack?: () => void
}

export function MessageThreadHeader({ otherParty, bookingStatus, onBack }: Props) {
  return (
    <header className="h-20 px-6 flex items-center justify-between sticky top-0 bg-[#FDFBF7]/80 backdrop-blur-md z-10 border-b border-[#1A1A1A]/5">
      <div className="flex items-center gap-4">
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-full p-2 transition-colors hover:bg-[#1A1A1A]/5 md:hidden">
            <ArrowLeft className="h-5 w-5 text-[#717171]" />
          </button>
        )}
        {otherParty && (
          <>
            <div className="relative">
              <Avatar src={otherParty.image} name={otherParty.name} size="md" />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold leading-tight text-[#1A1A1A]">{otherParty.name}</h2>
              {bookingStatus && (
                <div className="mt-0.5">
                  <BookingStatusPill status={bookingStatus} size="sm" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
