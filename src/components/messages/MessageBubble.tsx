'use client'

import { Avatar } from '@/components/ui/Avatar'
import type { MessageWithSender } from '@/types/messages'

interface Props {
  message: MessageWithSender
  isOwn: boolean
  showAvatar: boolean
}

function formatMessageTime(date: string) {
  return new Date(date).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function MessageBubble({ message, isOwn, showAvatar }: Props) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} max-w-2xl ${isOwn ? 'self-end' : ''}`}>
      {!isOwn && showAvatar ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mt-1">
          <Avatar src={message.sender.image} name={message.sender.name} size="xs" />
        </div>
      ) : !isOwn ? (
        <div className="w-8 flex-shrink-0" />
      ) : null}
      <div className={`flex flex-col ${isOwn ? 'items-end' : ''} gap-1.5`}>
        <div
          className={`p-4 text-sm leading-relaxed shadow-sm ${
            isOwn
              ? 'bg-[#E96B56] text-white rounded-tl-xl rounded-bl-xl rounded-br-xl'
              : 'bg-[#f9f2ef] text-[#1A1A1A] rounded-tr-xl rounded-br-xl rounded-bl-xl'
          }`}
        >
          {message.text}
        </div>
        <span className={`text-[10px] text-[#717171] ${isOwn ? 'mr-1' : 'ml-1'}`}>
          {formatMessageTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}
