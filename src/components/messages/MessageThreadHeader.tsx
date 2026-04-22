'use client'

import { ArrowLeft, BadgeCheck, MoreVertical } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface Props {
  otherParty: { id: string; name: string; image: string | null } | null
  bookingStatus: string | null
  visitCount?: number
  onBack?: () => void
}

export function MessageThreadHeader({ otherParty, bookingStatus, visitCount, onBack }: Props) {
  return (
    <header className="h-20 border-b border-[#E96B56]/5 px-8 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-full p-2 hover:bg-[#1A1A1A]/5 transition-colors md:hidden">
            <ArrowLeft className="h-5 w-5 text-[#717171]" />
          </button>
        )}

        {otherParty && (
          <>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden">
                <Avatar src={otherParty.image} name={otherParty.name} size="sm" className="w-full h-full rounded-xl" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight text-[#1A1A1A]">{otherParty.name}</h2>
              <p className="text-[10px] text-[#E96B56] tracking-wide font-bold flex items-center gap-1 uppercase">
                <BadgeCheck className="h-3 w-3" />
                {bookingStatus ? bookingStatus.replace('_', ' ') : 'Client'}
                {visitCount ? ` • ${visitCount} visits` : ''}
              </p>
            </div>
          </>
        )}
      </div>

      {otherParty && (
        <div className="flex items-center gap-3">
          <button className="h-10 px-6 rounded-full border border-[#E96B56]/20 text-xs font-bold text-[#1A1A1A] hover:bg-[#E96B56]/5 transition-colors uppercase tracking-widest">
            Client Profile
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  )
}
