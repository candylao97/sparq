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
