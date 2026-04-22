'use client'

import { Suspense } from 'react'
import { useMessages } from '@/hooks/useMessages'
import { MessagesLayout } from '@/components/messages/MessagesLayout'

function MessagesContent() {
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
    session,
    status,
  } = useMessages()

  if (status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  return (
    // flex-1 overflow-hidden — fits inside the dashboard layout's content area
    <div className="flex-1 overflow-hidden">
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
        currentUserId={session?.user?.id || ''}
      />
    </div>
  )
}

export default function ProviderMessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
