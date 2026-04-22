'use client'

import { useState } from 'react'
import { Send, PlusCircle, FileText, Images } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
  otherPartyName?: string
}

export function MessageInput({ onSend, disabled, otherPartyName }: Props) {
  const [text, setText] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <footer className="p-6 border-t border-[#E96B56]/5 bg-white/80 backdrop-blur-md">
      {/* Action pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E96B56]/10 text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider hover:bg-[#E96B56]/20 transition-colors">
          <PlusCircle className="h-3.5 w-3.5" />
          Share Service
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#fce8e5] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider hover:bg-[#f9d4cf] transition-colors">
          <FileText className="h-3.5 w-3.5" />
          Send Quote
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E96B56]/5 text-[#717171] text-[10px] font-bold uppercase tracking-wider hover:bg-[#E96B56]/10 transition-colors">
          <Images className="h-3.5 w-3.5" />
          Portfolio
        </button>
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-4">
        <div className="flex-1 bg-[#fdf6f4] rounded-2xl p-4 min-h-[56px] flex items-center border border-[#E96B56]/5 shadow-inner">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={otherPartyName ? `Type your message to ${otherPartyName}...` : 'Write your message...'}
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none py-0 placeholder:text-[#1A1A1A]/40 text-[#1A1A1A] outline-none"
            style={{ maxHeight: '128px' }}
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="w-14 h-14 flex-shrink-0 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </footer>
  )
}
