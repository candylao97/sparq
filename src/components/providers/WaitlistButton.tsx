'use client'
import { useState } from 'react'
import { Bell, Check } from 'lucide-react'

interface WaitlistButtonProps {
  providerId: string
  serviceId?: string
  reason?: string
}

export function WaitlistButton({ providerId, serviceId, reason }: WaitlistButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'joined' | 'error'>('idle')

  async function handleJoin() {
    setState('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, serviceId }),
      })
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        return
      }
      setState('joined')
    } catch {
      setState('error')
    }
  }

  if (state === 'joined') {
    return (
      <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm px-4 py-2.5 rounded-full">
        <Check className="w-4 h-4" />
        You&apos;re on the waitlist — we&apos;ll notify you when they&apos;re available
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleJoin}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#333] text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors disabled:opacity-60"
      >
        <Bell className="w-4 h-4" />
        {state === 'loading' ? 'Joining…' : 'Join waitlist'}
      </button>
      <p className="text-xs text-[#717171] text-center mt-1.5">
        {reason ?? 'Be the first to know when they have availability'}
      </p>
    </div>
  )
}
