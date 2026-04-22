'use client'

import { useState, useEffect, useMemo } from 'react'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { BookingDetailsPanel } from './BookingDetailsPanel'
import { EmptyState } from './EmptyState'
import type { ConversationListItem, MessageWithSender, BookingDetailsForMessages } from '@/types/messages'


type MobileView = 'list' | 'thread'

interface Props {
  conversations: ConversationListItem[]
  activeBookingId: string | null
  messages: MessageWithSender[]
  bookingDetails: BookingDetailsForMessages | null
  loading: boolean
  messagesLoading: boolean
  sending: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelectConversation: (bookingId: string) => void
  onSendMessage: (text: string) => void
  onRefresh?: () => void
  lastFetchedAt?: Date
  currentUserId: string
}

export function MessagesLayout({
  conversations,
  activeBookingId,
  messages,
  bookingDetails,
  loading,
  messagesLoading,
  sending,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onSendMessage,
  onRefresh,
  lastFetchedAt,
  currentUserId,
}: Props) {
  const [mobileView, setMobileView] = useState<MobileView>('list')

  // When selecting a conversation on mobile, switch to thread view
  function handleSelect(bookingId: string) {
    onSelectConversation(bookingId)
    setMobileView('thread')
  }

  // Get other party from active conversation
  const activeConvo = useMemo(
    () => conversations.find(c => c.bookingId === activeBookingId),
    [conversations, activeBookingId]
  )
  const otherParty = activeConvo?.otherParty || null

  // Reset to list view when there's no active booking
  useEffect(() => {
    if (!activeBookingId) setMobileView('list')
  }, [activeBookingId])

  const hasConversations = !loading && conversations.length > 0

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — conversation list */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} w-full md:flex md:w-auto`}>
        <ConversationList
          conversations={conversations}
          activeBookingId={activeBookingId}
          onSelect={handleSelect}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          loading={loading}
          currentUserId={currentUserId}
          onRefresh={onRefresh}
          lastFetchedAt={lastFetchedAt}
        />
      </div>

      {/* Middle panel — message thread */}
      <div className={`${mobileView === 'thread' ? 'flex' : 'hidden'} min-w-0 flex-1 md:flex`}>
        {hasConversations && activeBookingId ? (
          !otherParty?.name ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <p className="font-jakarta text-sm font-semibold text-[#1A1A1A]">This conversation is no longer available</p>
              <p className="font-jakarta text-xs text-[#717171] mt-1">The artist may have removed their account.</p>
            </div>
          ) : (
            <MessageThread
              messages={messages}
              currentUserId={currentUserId}
              otherParty={otherParty}
              bookingStatus={activeConvo?.booking.status || null}
              onSendMessage={onSendMessage}
              sending={sending}
              loading={messagesLoading}
              onBack={() => setMobileView('list')}
            />
          )
        ) : (
          <EmptyState variant={hasConversations ? 'no-selection' : 'no-conversations'} />
        )}
      </div>

      {/* Right panel — booking details */}
      {hasConversations && activeBookingId && (
        <BookingDetailsPanel
          booking={bookingDetails}
          currentUserId={currentUserId}
          loading={!bookingDetails}
        />
      )}
    </div>
  )
}
