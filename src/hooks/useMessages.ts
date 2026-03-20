'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ConversationListItem, MessageWithSender, BookingDetailsForMessages } from '@/types/messages'

const MESSAGE_POLL_INTERVAL_MS = 5_000
const CONVERSATION_POLL_INTERVAL_MS = 15_000

export function useMessages() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [bookingDetails, setBookingDetails] = useState<BookingDetailsForMessages | null>(null)
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const activeBookingRef = useRef<string | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  // Track whether initial load auto-selected, to avoid double-fetch from the effect
  const initialLoadRef = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchConversations = useCallback(async (silent = false) => {
    if (!session?.user) return
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/messages/conversations')
      if (!res.ok) {
        console.error('fetchConversations failed:', res.status)
        return
      }
      const data = await res.json()
      setConversations(data.conversations)

      // Auto-select from URL or first conversation (only on initial load)
      if (!silent && data.conversations.length > 0) {
        const urlBookingId = searchParams.get('bookingId')
        const target = urlBookingId && data.conversations.find((c: ConversationListItem) => c.bookingId === urlBookingId)
          ? urlBookingId
          : data.conversations[0].bookingId
        setActiveBookingId(target)
        activeBookingRef.current = target
        initialLoadRef.current = true
      }
    } catch (err) {
      console.error('fetchConversations error:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [session, searchParams])

  const fetchMessages = useCallback(async (bookingId: string, silent = false) => {
    if (!silent) setMessagesLoading(true)
    try {
      const res = await fetch(`/api/messages?bookingId=${bookingId}`)
      if (!res.ok) {
        console.error('fetchMessages failed:', res.status)
        return
      }
      const data = await res.json()
      const newMessages: MessageWithSender[] = data.messages

      // Only update state if messages actually changed (prevents unnecessary re-renders)
      const newLastId = newMessages.length > 0 ? newMessages[newMessages.length - 1].id : null
      if (silent && newLastId === lastMessageIdRef.current) return

      lastMessageIdRef.current = newLastId
      setMessages(newMessages)
    } catch (err) {
      console.error('fetchMessages error:', err)
    } finally {
      if (!silent) setMessagesLoading(false)
    }
  }, [])

  const fetchBookingDetails = useCallback(async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`)
      if (!res.ok) {
        console.error('fetchBookingDetails failed:', res.status)
        return
      }
      const data = await res.json()
      setBookingDetails(data.booking)
    } catch (err) {
      console.error('fetchBookingDetails error:', err)
    }
  }, [])

  const markAsRead = useCallback(async (bookingId: string) => {
    try {
      await fetch('/api/messages/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      // Update local unread count
      setConversations(prev =>
        prev.map(c => c.bookingId === bookingId ? { ...c, unreadCount: 0 } : c)
      )
    } catch (err) {
      console.error('markAsRead error:', err)
    }
  }, [])

  const selectConversation = useCallback(async (bookingId: string) => {
    setActiveBookingId(bookingId)
    activeBookingRef.current = bookingId
    lastMessageIdRef.current = null // Reset so new messages load fresh
    router.push(`/messages?bookingId=${bookingId}`, { scroll: false })
    await Promise.all([
      fetchMessages(bookingId),
      fetchBookingDetails(bookingId),
      markAsRead(bookingId),
    ])
  }, [router, fetchMessages, fetchBookingDetails, markAsRead])

  const sendMessage = useCallback(async (text: string) => {
    if (!activeBookingId || !session?.user) return
    setSending(true)
    try {
      // Optimistic update
      const optimistic: MessageWithSender = {
        id: `temp-${Date.now()}`,
        bookingId: activeBookingId,
        senderId: session.user.id,
        text,
        read: false,
        createdAt: new Date().toISOString(),
        sender: { id: session.user.id, name: session.user.name || null, image: session.user.image || null },
      }
      setMessages(prev => [...prev, optimistic])

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: activeBookingId, text }),
      })

      if (res.ok) {
        // Refresh real messages and conversations
        lastMessageIdRef.current = null // Force update
        await Promise.all([
          fetchMessages(activeBookingId, true),
          fetchConversations(true),
        ])
      } else {
        // Rollback optimistic update on failure
        console.error('sendMessage failed:', res.status)
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } catch (err) {
      console.error('sendMessage error:', err)
    } finally {
      setSending(false)
    }
  }, [activeBookingId, session, fetchMessages, fetchConversations])

  // Initial load
  useEffect(() => {
    if (session) fetchConversations()
  }, [session, fetchConversations])

  // When activeBookingId is set from initial auto-select, load messages
  // Skip if it was set by selectConversation (which already fetches)
  useEffect(() => {
    if (activeBookingId && initialLoadRef.current) {
      initialLoadRef.current = false
      fetchMessages(activeBookingId)
      fetchBookingDetails(activeBookingId)
      markAsRead(activeBookingId)
    }
  }, [activeBookingId, fetchMessages, fetchBookingDetails, markAsRead])

  // Polling with visibility awareness
  useEffect(() => {
    if (!session) return

    let msgInterval: ReturnType<typeof setInterval>
    let convInterval: ReturnType<typeof setInterval>

    function startPolling() {
      msgInterval = setInterval(() => {
        if (activeBookingRef.current) {
          fetchMessages(activeBookingRef.current, true)
        }
      }, MESSAGE_POLL_INTERVAL_MS)

      convInterval = setInterval(() => {
        fetchConversations(true)
      }, CONVERSATION_POLL_INTERVAL_MS)
    }

    function stopPolling() {
      clearInterval(msgInterval)
      clearInterval(convInterval)
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling()
      } else {
        // Fetch immediately on tab focus, then resume polling
        if (activeBookingRef.current) {
          fetchMessages(activeBookingRef.current, true)
        }
        fetchConversations(true)
        startPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, fetchMessages, fetchConversations])

  return {
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
  }
}
