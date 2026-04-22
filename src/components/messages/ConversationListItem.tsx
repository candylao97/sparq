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
  const hasUnread = (unreadCount || 0) > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-4 p-4 rounded-xl text-left transition-all',
        isActive
          ? 'bg-white shadow-sm'
          : 'hover:bg-[#E96B56]/5 transition-colors',
      )}
    >
      {/* Active left bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#E96B56] rounded-r-full" />
      )}

      {/* Avatar — rounded-xl to match mockup */}
      <div className="relative flex-shrink-0">
        <div className={cn('w-14 h-14 rounded-xl overflow-hidden', !isActive && 'grayscale opacity-60 group-hover:grayscale-0')}>
          <Avatar src={otherParty.image} name={otherParty.name} size="md" className="w-full h-full rounded-xl" />
        </div>
        {hasUnread && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#E96B56] border-2 border-white rounded-full" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between mb-1">
          <p className={cn(
            'truncate text-sm text-[#1A1A1A]',
            hasUnread ? 'font-semibold' : 'font-normal'
          )}>
            {otherParty.name}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasUnread && (
              <span className="w-2 h-2 rounded-full bg-[#E96B56] flex-shrink-0" aria-label="Unread messages" />
            )}
            <span className="text-[10px] font-medium text-[#717171]">
              {lastMessage ? relativeTime(lastMessage.createdAt) : ''}
            </span>
          </div>
        </div>

        {hasUnread ? (
          <p className="text-xs text-[#E96B56] font-bold truncate mb-1 italic">New message</p>
        ) : (
          <p className="text-xs text-[#717171]/80 truncate mb-1">
            {lastMessage
              ? (lastMessage.senderId === currentUserId ? 'You: ' : '') + truncate(lastMessage.text, 38)
              : 'No messages yet'}
          </p>
        )}

        <p className="text-[10px] text-[#717171] uppercase tracking-wider font-bold truncate">
          {service.title}
        </p>
      </div>
    </button>
  )
}
