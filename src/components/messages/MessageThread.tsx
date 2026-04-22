'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { MessageThreadHeader } from './MessageThreadHeader'
import { formatShortDate } from '@/lib/utils'
import type { MessageWithSender } from '@/types/messages'

const MS_PER_DAY = 86_400_000

interface Props {
  messages: MessageWithSender[]
  currentUserId: string
  otherParty: { id: string; name: string; image: string | null } | null
  bookingStatus: string | null
  onSendMessage: (text: string) => void
  sending: boolean
  loading: boolean
  onBack?: () => void
}

function groupByDate(messages: MessageWithSender[]) {
  const groups: { date: string; label: string; messages: MessageWithSender[] }[] = []
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - MS_PER_DAY).toDateString()

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt).toDateString()
    const label = msgDate === today ? 'Today' : msgDate === yesterday ? 'Yesterday' : formatShortDate(msg.createdAt)

    if (groups.length === 0 || groups[groups.length - 1].date !== msgDate) {
      groups.push({ date: msgDate, label, messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }
  return groups
}

export function MessageThread({ messages, currentUserId, otherParty, bookingStatus, onSendMessage, sending, loading, onBack }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false)

  // UX-4: Only auto-scroll when new messages arrive and user is near the bottom (within 200px)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const container = scrollContainerRef.current
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        if (distanceFromBottom <= 200) {
          endRef.current?.scrollIntoView({ behavior: 'smooth' })
          setShowNewMessageBadge(false)
        } else {
          setShowNewMessageBadge(true)
        }
      } else {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  // Memoize groupByDate to avoid recomputing on every render
  const grouped = useMemo(() => groupByDate(messages), [messages])

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      <MessageThreadHeader otherParty={otherParty} bookingStatus={bookingStatus} onBack={onBack} />

      <div className="relative flex-1 overflow-hidden">
      {showNewMessageBadge && (
        <button
          onClick={() => {
            endRef.current?.scrollIntoView({ behavior: 'smooth' })
            setShowNewMessageBadge(false)
          }}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-[#333] transition-colors"
        >
          New message ↓
        </button>
      )}
      <div ref={scrollContainerRef} className="h-full overflow-y-auto px-10 py-10 flex flex-col gap-8">
        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex gap-4 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                {i % 2 === 0 && <Skeleton className="h-8 w-8 flex-shrink-0 rounded-lg" />}
                <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? 'w-64' : 'w-56'}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {grouped.map(group => (
              <div key={group.date} className="flex flex-col gap-8">
                {/* Date separator */}
                <div className="flex justify-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E96B56]/60 bg-[#fdf6f4] px-4 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {group.messages.map((msg, i) => {
                    const isOwn = msg.senderId === currentUserId
                    const prev = group.messages[i - 1]
                    const showAvatar = !prev || prev.senderId !== msg.senderId
                    return <MessageBubble key={msg.id} message={msg} isOwn={isOwn} showAvatar={showAvatar} />
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      </div>

      <MessageInput onSend={onSendMessage} disabled={sending} otherPartyName={otherParty?.name} />
    </div>
  )
}
