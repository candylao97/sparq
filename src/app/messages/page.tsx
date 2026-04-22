'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMessages } from '@/hooks/useMessages'
import { MessagesLayout } from '@/components/messages/MessagesLayout'

function MessagesContent() {
  const searchParams = useSearchParams()
  const providerId = searchParams.get('providerId')

  const {
    conversations,
    activeBookingId,
    messages,
    bookingDetails,
    loading,
    messagesLoading,
    sending,
    searchQuery,
    setSearchQuery,
    selectConversation,
    sendMessage,
    fetchConversations,
    lastFetchedAt,
    session,
    status,
  } = useMessages()

  // Auto-select the most recent conversation with the target provider
  const didAutoSelect = useRef(false)
  useEffect(() => {
    if (!providerId || loading || conversations.length === 0 || didAutoSelect.current) return
    const match = conversations.find(c => c.otherParty.id === providerId)
    if (match && match.bookingId !== activeBookingId) {
      didAutoSelect.current = true
      selectConversation(match.bookingId)
    }
  }, [providerId, conversations, loading, activeBookingId, selectConversation])

  if (status === 'loading') {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-80px)] overflow-hidden">
      <MessagesLayout
        conversations={conversations}
        activeBookingId={activeBookingId}
        messages={messages}
        bookingDetails={bookingDetails}
        loading={loading}
        messagesLoading={messagesLoading}
        sending={sending}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectConversation={selectConversation}
        onSendMessage={sendMessage}
        onRefresh={() => fetchConversations(false)}
        lastFetchedAt={lastFetchedAt}
        currentUserId={session?.user?.id || ''}
      />
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
