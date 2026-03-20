'use client'

import { useRef, useEffect, useMemo } from 'react'
import { Shield } from 'lucide-react'
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
  const prevMessageCountRef = useRef(0)

  // Only auto-scroll when new messages arrive, not on every poll
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  // Memoize groupByDate to avoid recomputing on every render
  const grouped = useMemo(() => groupByDate(messages), [messages])

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#FDFBF7]">
      <MessageThreadHeader otherParty={otherParty} bookingStatus={bookingStatus} onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
        {/* On-platform safety nudge */}
        <div className="flex items-center gap-2 rounded-xl bg-[#f9f2ef] px-4 py-3 text-xs text-[#717171]">
          <Shield className="h-3.5 w-3.5 flex-shrink-0 text-[#717171]" />
          <span>For your protection, keep payments and bookings on Sparq.</span>
        </div>

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                {i % 2 === 0 && <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />}
                <Skeleton className={`h-14 rounded-xl ${i % 2 === 0 ? 'w-48' : 'w-40'}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(group => (
              <div key={group.date} className="flex flex-col gap-6">
                {/* Date separator pill */}
                <div className="flex justify-center">
                  <span className="px-4 py-1 rounded-full bg-[#f3ece9] text-[10px] uppercase tracking-widest font-bold text-[#717171]">
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

      <MessageInput onSend={onSendMessage} disabled={sending} />
    </div>
  )
}
