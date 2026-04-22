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
    <div className={`flex gap-4 max-w-2xl ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}>
      {/* Avatar — only for received messages */}
      {!isOwn && (
        <div className="flex-shrink-0 w-8 h-8 mt-1">
          {showAvatar ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Avatar src={message.sender.image} name={message.sender.name} size="xs" className="w-full h-full rounded-lg" />
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      <div className={`flex flex-col gap-1.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`p-5 text-sm leading-relaxed shadow-sm ${
          isOwn
            ? 'bg-[#E96B56] text-white rounded-2xl rounded-tr-none shadow-[#E96B56]/10'
            : 'bg-[#fdf6f4] text-[#1A1A1A] rounded-2xl rounded-tl-none border border-[#E96B56]/10'
        }`}>
          {message.text}
        </div>
        <div className={`flex items-center gap-1.5 ${isOwn ? 'pr-1 justify-end' : 'pl-1'}`}>
          <span className="text-[10px] font-medium text-[#717171]">
            {formatMessageTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="text-[10px] text-[#717171]">
              {message.read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
