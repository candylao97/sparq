'use client'

import { useMemo } from 'react'
import { Search, MessageSquare } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConversationListItem } from './ConversationListItem'
import type { ConversationListItem as ConversationItem } from '@/types/messages'

interface Props {
  conversations: ConversationItem[]
  activeBookingId: string | null
  onSelect: (bookingId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  loading: boolean
  currentUserId: string
}

export function ConversationList({ conversations, activeBookingId, onSelect, searchQuery, onSearchChange, loading, currentUserId }: Props) {
  const filtered = useMemo(() => searchQuery
    ? conversations.filter(c =>
        c.otherParty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.service.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations, [conversations, searchQuery])

  return (
    <div className="flex h-full w-full flex-col border-r border-[#1A1A1A]/5 bg-[#f9f2ef] md:w-[360px] md:flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 px-6 py-5">
        <h1 className="font-headline text-xl font-bold text-[#1A1A1A]">Messages</h1>
      </div>

      {/* Search */}
      <div className="border-b border-[#1A1A1A]/5 px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-[#1A1A1A]/10 bg-white px-4 py-2.5">
          <Search className="h-4 w-4 text-[#717171]" />
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search messages"
            className="flex-1 bg-transparent text-sm text-[#1A1A1A] outline-none placeholder:text-[#717171]/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0 divide-y divide-[#1A1A1A]/5 p-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4">
                <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-[#1A1A1A]/5">
            {filtered.map(c => (
              <ConversationListItem
                key={c.bookingId}
                conversation={c}
                isActive={c.bookingId === activeBookingId}
                onClick={() => onSelect(c.bookingId)}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <MessageSquare className="mb-3 h-10 w-10 text-[#717171]/30" />
            <p className="text-sm text-[#717171]">
              {searchQuery ? 'No conversations match your search' : 'No messages yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
