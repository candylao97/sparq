'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import type { DashboardReview } from '@/types/dashboard'

const FALLBACK_SUGGESTIONS = [
  'Thank you so much for taking the time to leave a review, it really means a lot!',
  "I appreciate your feedback and hope to see you again soon!",
]

interface Props {
  open: boolean
  onClose: () => void
  review: DashboardReview | null
  onSubmitted: () => void
}

export function ReviewReplyModal({ open, onClose, review, onSubmitted }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState('')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!open || !review) return
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
          content: `Suggest exactly 2 brief, warm reply options for this ${review.rating}-star review from ${review.customer.name}: "${review.text || 'No text provided'}". The service was ${review.booking?.service?.title || 'a session'}. Each reply should be 1-2 sentences, professional and genuine. Return ONLY a JSON array of 2 strings, no explanation.`,
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
          setSuggestions(parsed.slice(0, 2))
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
  }, [open, review, review?.id])

  const response = selected || custom

  const handleSubmit = async () => {
    if (!review || !response) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      if (!res.ok) {
        if (res.status === 422) {
          throw new Error('Response contains contact information (phone/email/social). Please remove it and try again.')
        }
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }
      toast.success('Reply posted!')
      onSubmitted()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit reply'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!review) return null

  return (
    <Modal open={open} onClose={onClose} title="Reply to Review" size="md">
      <div className="space-y-4">
        {/* Review being replied to */}
        <div className="rounded-xl bg-[#f9f2ef] p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-body-compact font-semibold text-[#1A1A1A]">{review.customer.name}</p>
            <div className="flex gap-0.5 text-amber-400">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
            </div>
          </div>
          {review.text && (
            <p className="text-xs leading-relaxed text-[#717171]">{review.text}</p>
          )}
        </div>

        <p className="text-body-compact text-[#717171]">Choose a suggested reply or write your own:</p>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
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
          placeholder="Or write your own reply..."
          rows={3}
          className="w-full resize-none rounded-xl border border-[#e8e1de] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#E96B56]"
        />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!response}
            loading={submitting}
            fullWidth
          >
            Post Reply
          </Button>
        </div>
      </div>
    </Modal>
  )
}
