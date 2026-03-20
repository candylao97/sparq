'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export function MessageInput({ onSend, disabled }: Props) {
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
    <footer className="p-4 bg-[#FDFBF7]">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-end gap-3 bg-[#f9f2ef] p-2 rounded-2xl shadow-sm border border-[#1A1A1A]/5">
        <div className="flex-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message..."
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 text-sm py-3 px-3 resize-none text-[#1A1A1A] placeholder:text-[#717171]/50 outline-none"
            style={{ maxHeight: '128px' }}
          />
        </div>
        <div className="flex items-center gap-1 p-1">
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className="h-10 w-10 flex items-center justify-center bg-[#E96B56] text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
      <p className="text-center text-[10px] text-[#717171] mt-3 opacity-60">
        Sparq Secure · All messages are encrypted for your privacy.
      </p>
    </footer>
  )
}
