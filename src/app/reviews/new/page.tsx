'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface BookingDetails {
  id: string
  service: { title: string }
  provider: { name: string }
  date: string
}

function ReviewForm() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loadingBooking, setLoadingBooking] = useState(true)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchBooking = useCallback(async () => {
    if (!bookingId) { setLoadingBooking(false); return }
    try {
      const res = await fetch(`/api/bookings/${bookingId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBooking(data.booking)
    } catch {
      toast.error('Booking not found')
    } finally {
      setLoadingBooking(false)
    }
  }, [bookingId])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') fetchBooking()
  }, [status, router, fetchBooking])

  // UX-2: Restore draft from localStorage on mount
  useEffect(() => {
    if (!bookingId) return
    const saved = localStorage.getItem(`review-draft-${bookingId}`)
    if (saved && saved.length > 0) {
      setText(saved)
    }
  }, [bookingId])

  // UX-2: Auto-save draft to localStorage on text change
  useEffect(() => {
    if (!bookingId) return
    if (text.length > 0) {
      localStorage.setItem(`review-draft-${bookingId}`, text)
    }
  }, [text, bookingId])

  const MIN_REVIEW_LENGTH = 20

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { toast.error('Please select a star rating'); return }
    if (text.length > 0 && text.length < MIN_REVIEW_LENGTH) {
      toast.error(`Your review is too short — please write at least ${MIN_REVIEW_LENGTH} characters.`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, rating, text }),
      })
      if (!res.ok) {
        const err = await res.json()
        const errMsg: string = err.error || 'Failed to submit review'
        if (errMsg.toLowerCase().includes('contact information') || errMsg.toLowerCase().includes('contact info')) {
          toast.error('Your review contains contact info (e.g. phone or email). Please remove it and try again.')
        } else {
          throw new Error(errMsg)
        }
        return
      }
      toast.success('Review submitted — thank you!')
      if (bookingId) localStorage.removeItem(`review-draft-${bookingId}`)
      router.push('/bookings?reviewed=1')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loadingBooking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (!bookingId || !booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-4 px-4 text-center">
        <h1 className="font-headline text-2xl font-bold text-[#1A1A1A]">Booking not found</h1>
        <p className="text-[#717171]">We couldn&apos;t find this booking. It may have already been reviewed.</p>
        <Link href="/bookings" className="text-[#E96B56] font-medium hover:underline">Back to appointments</Link>
      </div>
    )
  }

  const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Link
          href="/bookings?tab=completed"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to appointments
        </Link>

        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-[#1A1A1A]">Leave a review</h1>
          <p className="mt-2 text-[#717171]">
            Share your experience with{' '}
            <span className="font-medium text-[#1A1A1A]">{booking.provider.name}</span>
            {' '}for{' '}
            <span className="font-medium text-[#1A1A1A]">{booking.service.title}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
              Overall rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform active:scale-90"
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      star <= (hover || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-[#e8e1de]'
                    }`}
                  />
                </button>
              ))}
              {(hover || rating) > 0 && (
                <span className="ml-2 text-sm font-medium text-[#717171]">
                  {STAR_LABELS[hover || rating]}
                </span>
              )}
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Written review <span className="font-normal text-[#717171]">(optional)</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="Tell other clients what you loved, what surprised you, and what they should expect..."
              className={`w-full resize-none rounded-xl border px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none transition-all focus:ring-2 focus:ring-[#E96B56]/10 ${
                text.length > 0 && text.length < MIN_REVIEW_LENGTH
                  ? 'border-amber-400 focus:border-amber-400'
                  : 'border-[#e8e1de] focus:border-[#E96B56]'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              <p className={`text-xs ${text.length < MIN_REVIEW_LENGTH ? 'text-[#E96B56]' : 'text-[#717171]'}`}>
                {text.length < MIN_REVIEW_LENGTH ? `${text.length}/20 minimum` : `${text.length} characters`}
              </p>
              <p className="text-xs text-[#717171]">{2000 - text.length} remaining</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || rating === 0 || (text.length > 0 && text.length < MIN_REVIEW_LENGTH) || text.length > 2000}
            className="w-full rounded-xl bg-[#E96B56] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#a63a29] disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>

          <p className="text-center text-xs text-[#717171]">
            Reviews are public and help other clients choose the right artist.
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ReviewNewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewForm />
    </Suspense>
  )
}
