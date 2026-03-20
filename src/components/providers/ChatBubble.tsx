'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Bot, Sparkles, RefreshCw, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGE =
  'Hi! I can help you find the right artist, walk you through bookings, or sort out an issue — just ask.'

const QUICK_PROMPTS = [
  'Help me find a nail or lash artist',
  'I want a music or language teacher',
  'How do bookings and payments work?',
  'I need support with a booking',
]

export function ChatBubble() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: INITIAL_MESSAGE }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userRole: session?.user?.role || 'CUSTOMER',
          currentPage: pathname,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please try again!' }])
    } finally {
      setLoading(false)
    }
  }

  function startPrompt(prompt: string) {
    setInput(prompt)
  }

  function resetChat() {
    setMessages([{ role: 'assistant', content: INITIAL_MESSAGE }])
    setInput('')
  }

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[560px] w-[calc(100vw-24px)] max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-[#e8e1de] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.18)] animate-fade-in sm:right-6 sm:w-[420px]">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-gray-900 to-gray-800 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sparq AI</p>
              <p className="text-xs text-white/70">Bookings, discovery, and support guidance</p>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="ml-auto hidden rounded-lg p-1.5 transition-colors hover:bg-white/10 sm:block"
              aria-label="Reset chat"
            >
              <RefreshCw className="h-4 w-4 text-white" />
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="border-b border-[#e8e1de] bg-[#fbfaf7] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => startPrompt(prompt)}
                  className="rounded-full border border-[#e8e1de] bg-white px-3 py-1.5 text-xs text-[#717171] transition-colors hover:border-gray-400 hover:text-[#1A1A1A]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbfaf7] p-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1A1A1A]">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}
                {msg.role === 'user' && (
                  session ? (
                    <Avatar src={session.user?.image} name={session.user?.name} size="xs" />
                  ) : (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold text-white">
                      You
                    </div>
                  )
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-6 ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-[#1A1A1A] text-white'
                    : 'rounded-tl-sm border border-[#e8e1de] bg-white text-[#1A1A1A]'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {messages.length === 1 && !loading && (
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-[#e8e1de] bg-white px-3.5 py-2 text-xs font-medium text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef]"
              >
                Need human support? Go to Contact
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#717171]">
                  Thinking through the best next step...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-[#e8e1de] bg-white p-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about bookings, artists, payments, or support..."
              className="flex-1 rounded-xl border border-[#e8e1de] bg-[#fbfaf7] px-3.5 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="rounded-xl bg-[#1A1A1A] p-2.5 text-white transition-colors hover:bg-[#1A1A1A] disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Bubble Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 px-5 shadow-xl transition-transform hover:scale-[1.03] sm:bottom-6 sm:right-6"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && <span className="hidden text-sm font-semibold text-white sm:block">Ask Sparq AI</span>}
      </button>
    </>
  )
}
