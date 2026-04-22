'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

interface Props {
  variant: 'no-conversations' | 'no-selection'
}

export function EmptyState({ variant }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-white">
      <MessageSquare className="mb-4 h-12 w-12 text-[#717171]/30" />
      {variant === 'no-conversations' ? (
        <>
          <p className="text-sm font-semibold text-[#1A1A1A]">No messages yet</p>
          <p className="mt-1 text-sm text-[#717171]">Once you book, you can message your artist directly here</p>
          <Link
            href="/search"
            className="mt-6 rounded-full bg-[#E96B56] px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
          >
            Find an artist
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#1A1A1A]">Pick a conversation</p>
          <p className="mt-1 text-sm text-[#717171]">Select a chat on the left to continue your conversation</p>
        </>
      )}
    </div>
  )
}
