'use client'

import { Avatar } from '@/components/ui/Avatar'
import { cn, relativeTime, truncate } from '@/lib/utils'
import type { ConversationListItem as ConversationItem } from '@/types/messages'

interface Props {
  conversation: ConversationItem
  isActive: boolean
  onClick: () => void
  currentUserId: string
}

export function ConversationListItem({ conversation, isActive, onClick, currentUserId }: Props) {
  const { otherParty, service, lastMessage, unreadCount } = conversation

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-6 py-4 text-left transition-all hover:bg-white/60',
        isActive && 'bg-white border-l-3 border-[#E96B56]',
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar src={otherParty.image} name={otherParty.name} size="md" />
        {unreadCount > 0 && (
          <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#f9f2ef] bg-[#E96B56]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className={cn('truncate text-sm', unreadCount > 0 ? 'font-semibold text-[#1A1A1A]' : 'font-medium text-[#1A1A1A]/80')}>
            {otherParty.name}
          </p>
          <span className="flex-shrink-0 text-[10px] text-[#717171]">
            {lastMessage ? relativeTime(lastMessage.createdAt) : ''}
          </span>
        </div>
        <p className="truncate text-[10px] uppercase tracking-wider text-[#717171] font-bold">{service.title}</p>
        <p className={cn('mt-0.5 truncate text-sm', unreadCount > 0 ? 'font-medium text-[#1A1A1A]' : 'text-[#717171]')}>
          {lastMessage
            ? (lastMessage.senderId === currentUserId ? 'You: ' : '') + truncate(lastMessage.text, 45)
            : 'No messages yet'}
        </p>
      </div>
    </button>
  )
}
