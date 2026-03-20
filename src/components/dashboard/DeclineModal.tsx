'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

const FALLBACK_SUGGESTIONS = [
  "I'm fully booked on that date. I'd love to help another time.",
  "Unfortunately I can't take this booking right now, but please try again soon.",
  "This time doesn't work for my schedule, feel free to request a different date.",
]

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  bookingContext: {
    serviceName: string
    customerName: string
    date: string
    time: string
  } | null
}

export function DeclineModal({ open, onClose, onConfirm, bookingContext }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string>('')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!open || !bookingContext) return
    setSelected('')
    setCustom('')
    setSuggestions([])
    setLoading(true)

    const controller = new AbortController()

    fetch('/api/ai/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona: 'provider',
        messages: [{
          role: 'user',
          content: `Suggest exactly 3 brief, polite decline reasons for a "${bookingContext.serviceName}" booking from ${bookingContext.customerName} on ${bookingContext.date} at ${bookingContext.time}. Each reason should be 1 sentence, warm and professional. Return ONLY a JSON array of 3 strings, no explanation.`,
        }],
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        const text = data.message || data.response || data.content || ''
        const match = text.match(/\[[\s\S]*\]/)
        if (match) {
          const parsed = JSON.parse(match[0])
          setSuggestions(parsed.slice(0, 3))
        } else {
          setSuggestions(FALLBACK_SUGGESTIONS)
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setSuggestions(FALLBACK_SUGGESTIONS)
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  // Depend on primitive fields to avoid re-triggering on object reference changes
  }, [open, bookingContext, bookingContext?.serviceName, bookingContext?.customerName, bookingContext?.date, bookingContext?.time])

  const reason = selected || custom

  return (
    <Modal open={open} onClose={onClose} title="Decline this booking" size="md">
      <div className="space-y-4">
        <p className="text-body-compact text-[#717171]">
          Let the client know why. Choose a suggested response or write your own — they&apos;ll see your message.
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setSelected(s); setCustom('') }}
                className={`w-full rounded-xl border p-3 text-left text-body-compact transition-all ${
                  selected === s
                    ? 'border-[#E96B56] bg-amber-50 text-[#1A1A1A]'
                    : 'border-[#e8e1de] bg-white text-[#717171] hover:border-[#e8e1de]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected('') }}
          placeholder="Or write your own reason..."
          rows={2}
          className="w-full resize-none rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#E96B56]"
        />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason}
            fullWidth
          >
            Decline booking
          </Button>
        </div>
      </div>
    </Modal>
  )
}
