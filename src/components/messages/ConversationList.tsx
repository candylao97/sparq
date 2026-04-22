'use client'

import { useMemo, useState } from 'react'
import { Search, MessageSquare } from 'lucide-react'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConversationListItem } from './ConversationListItem'
import type { ConversationListItem as ConversationItem } from '@/types/messages'
import { relativeTime } from '@/lib/utils'

type Filter = 'all' | 'unread' | 'bookings'

interface Props {
  conversations: ConversationItem[]
  activeBookingId: string | null
  onSelect: (bookingId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  loading: boolean
  currentUserId: string
  onRefresh?: () => void
  lastFetchedAt?: Date
}

export function ConversationList({ conversations, activeBookingId, onSelect, searchQuery, onSearchChange, loading, currentUserId, onRefresh, lastFetchedAt }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  const filtered = useMemo(() => {
    let list = conversations
    if (searchQuery) {
      list = list.filter(c =>
        c.otherParty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.service.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (filter === 'unread') list = list.filter(c => (c.unreadCount || 0) > 0)
    return list
  }, [conversations, searchQuery, filter])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'unread',   label: 'Unread'   },
    { key: 'bookings', label: 'Bookings' },
  ]

  return (
    <div className="flex h-full w-full flex-col border-r border-[#E96B56]/5 bg-[#fdf6f4] md:w-[380px] md:flex-shrink-0">

      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-black tracking-tight text-[#1A1A1A]">Inbox</h1>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <span className="bg-[#E96B56] text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest">
                {totalUnread} NEW
              </span>
            )}
            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                className="flex items-center gap-1 text-xs text-[#717171] hover:text-[#1A1A1A] transition-colors"
                aria-label="Refresh messages"
              >
                <RotateCcw className="w-3 h-3" /> Refresh
              </button>
            )}
          </div>
        </div>
        {lastFetchedAt && (
          <p className="text-[10px] text-[#717171] mb-3">Last updated {relativeTime(lastFetchedAt)}</p>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-colors ${
                filter === f.key
                  ? 'bg-[#E96B56]/10 text-[#1A1A1A]'
                  : 'bg-white text-[#717171] hover:bg-[#E96B56]/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717171]/50 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#E96B56]/30 transition-all text-[#1A1A1A] placeholder:text-[#717171]/40 shadow-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl">
              <Skeleton className="h-14 w-14 flex-shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-3 w-44 rounded" />
                <Skeleton className="h-2 w-20 rounded" />
              </div>
            </div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map(c => (
            <ConversationListItem
              key={c.bookingId}
              conversation={c}
              isActive={c.bookingId === activeBookingId}
              onClick={() => onSelect(c.bookingId)}
              currentUserId={currentUserId}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-[#717171]/20" />
            <p className="text-sm text-[#717171]">
              {searchQuery ? 'No conversations match your search' : 'No messages yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
