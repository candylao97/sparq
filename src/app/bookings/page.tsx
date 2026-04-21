'use client'

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays, MapPin, ArrowLeft, ArrowRight,
  ReceiptText, MessageCircle, Clock, CheckCircle, X, AlertTriangle, RotateCcw, Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatTime } from '@/lib/utils'
import { hoursUntilBooking } from '@/lib/booking-time'
import { ReceiptModal } from '@/components/dashboard/customer/ReceiptModal'
import type { CustomerBooking } from '@/types/dashboard'

type Filter = 'all' | 'upcoming' | 'completed' | 'cancelled'

// ── Refund estimate ──────────────────────────────────────────────

function estimateRefund(totalPrice: number, tipAmount: number, policyType: string, appointmentDate: string, appointmentTime: string): { refundAmount: number; message: string } {
  // AUDIT-037: Previously hardcoded `+10:00` which only matches AEST. During
  // AEDT (Oct–Apr) the real Sydney offset is +11:00, so the cancellation
  // window boundaries (6h / 24h / 48h) were off by an hour for roughly half
  // the year — that's enough to flip a FLEXIBLE booking from "full refund"
  // to "no refund" unfairly. hoursUntilBooking() handles DST via date-fns-tz.
  const dateStr = appointmentDate.includes('T') ? appointmentDate.split('T')[0] : appointmentDate
  const hoursLeft = hoursUntilBooking(dateStr, appointmentTime)
  const serviceBase = totalPrice - (tipAmount ?? 0)

  let refundPct = 1.0
  if (policyType === 'FLEXIBLE') {
    refundPct = hoursLeft >= 6 ? 1.0 : 0.0
  } else if (policyType === 'MODERATE') {
    refundPct = hoursLeft >= 24 ? 1.0 : 0.5
  } else if (policyType === 'STRICT') {
    if (hoursLeft >= 48) refundPct = 1.0
    else if (hoursLeft >= 24) refundPct = 0.5
    else refundPct = 0.0
  }

  const refundAmount = Math.floor(serviceBase * refundPct * 100) / 100 + (tipAmount ?? 0)
  const message = refundPct === 1.0
    ? `Full refund of $${refundAmount.toFixed(2)}`
    : refundPct > 0
      ? `Partial refund of $${refundAmount.toFixed(2)} (${Math.round(refundPct * 100)}% of service price)`
      : 'No refund — cancellation is within the no-refund window'

  return { refundAmount, message }
}

// ── Helpers ─────────────────────────────────────────────────────

const CATEGORY_IMAGES: Record<string, string> = {
  HAIR:    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
  MAKEUP:  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
  BROWS:   'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400',
  WAXING:  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
  MASSAGE: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
  FACIALS: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400',
  OTHER:   'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
}

function getServiceImage(_serviceTitle: string, _id: string, category?: string) {
  const key = (category ?? 'OTHER').toUpperCase()
  return CATEGORY_IMAGES[key] ?? CATEGORY_IMAGES['OTHER']
}

function isUpcoming(b: CustomerBooking) {
  return b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'RESCHEDULE_REQUESTED'
}

function isRecentlyCompleted(b: CustomerBooking) {
  return b.status === 'COMPLETED' && (Date.now() - new Date(b.date).getTime()) / 86_400_000 <= 30
}

function isCancelledStatus(s: string) {
  return [
    'CANCELLED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER',
    'DECLINED', 'EXPIRED', 'REFUNDED', 'NO_SHOW',
  ].includes(s)
}

function statusText(status: string) {
  if (status === 'CONFIRMED')                  return { label: 'Confirmed',              cls: 'text-blue-600' }
  if (status === 'PENDING')                    return { label: 'Pending approval',        cls: 'text-amber-600' }
  if (status === 'COMPLETED')                  return { label: 'Completed',               cls: 'text-green-600' }
  if (status === 'RESCHEDULE_REQUESTED')       return { label: 'Reschedule requested',    cls: 'text-purple-600' }
  if (status === 'DISPUTED')                   return { label: 'Dispute open',            cls: 'text-orange-600' }
  if (status === 'NO_SHOW')                    return { label: 'No-show',                 cls: 'text-red-500' }
  if (status === 'EXPIRED')                    return { label: 'Expired',                 cls: 'text-[#aaa]' }
  if (status === 'CANCELLED_BY_PROVIDER')      return { label: 'Cancelled by artist',     cls: 'text-red-400' }
  if (status === 'CANCELLED_BY_CUSTOMER')      return { label: 'Cancelled by you',        cls: 'text-[#aaa]' }
  return                                              { label: 'Cancelled',                cls: 'text-[#aaa]' }
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function relativeTime(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function longDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Booking Card ────────────────────────────────────────────────

function BookingCard({
  booking,
  onViewReceipt,
  onCancel,
  onReschedule,
  onDispute,
}: {
  booking: CustomerBooking
  onViewReceipt: (b: CustomerBooking) => void
  onCancel: (b: CustomerBooking) => void
  onReschedule: (b: CustomerBooking) => void
  onDispute: (b: CustomerBooking) => void
}) {
  const upcoming   = isUpcoming(booking)
  const completed  = booking.status === 'COMPLETED'
  const cancelled  = isCancelledStatus(booking.status)
  const st         = statusText(booking.status)

  const locationLabel =
    booking.locationType === 'AT_HOME' || booking.locationType === 'MOBILE'
      ? 'At home'
      : booking.locationType === 'STUDIO'
      ? `Studio${booking.provider.suburb ? ` · ${booking.provider.suburb}` : ''}`
      : booking.provider.suburb || 'Location TBC'

  const displayDate = completed || cancelled
    ? relativeTime(booking.date)
    : longDate(booking.date)

  return (
    <div className="group border-b border-[#f0ebe7] py-6 last:border-0">
      <div className="flex gap-5">

        {/* Image */}
        <Link href={`/providers/${booking.provider.id}`} className="flex-shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-xl bg-[#f3ece9] transition-opacity duration-200 group-hover:opacity-90 sm:h-24 sm:w-24">
            <img
              src={getServiceImage(booking.service.title, booking.provider.id, booking.service.category)}
              alt={booking.service.title}
              className="h-full w-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        </Link>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-start">

          {/* Left: info */}
          <div className="min-w-0 flex-1">
            {/* Status + dispute deadline pill */}
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${st.cls}`}>
                {st.label}
              </p>
              {/* P2-8: Dispute deadline pill */}
              {completed && !booking.dispute && booking.disputeDeadline && new Date() < new Date(booking.disputeDeadline) && (
                <span className="text-xs text-[#E96B56] bg-[#fdf2f0] px-2 py-0.5 rounded-full">
                  Dispute by {formatShortDate(booking.disputeDeadline)}
                </span>
              )}
            </div>

            {/* Service + provider */}
            <Link href={`/providers/${booking.provider.id}`} className="group/title">
              <h3 className="font-headline text-[1.05rem] font-semibold leading-snug text-[#1A1A1A] group-hover/title:underline">
                {booking.service.title}
              </h3>
            </Link>
            <p className="mt-0.5 text-sm text-[#717171]">
              {booking.provider.name}
              {booking.provider.suburb && (
                <span className="text-[#bbb]"> · {booking.provider.suburb}</span>
              )}
            </p>

            {/* Date + time */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#717171]">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-[#bbb]" />
                {displayDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 flex-shrink-0 text-[#bbb]" />
                {formatTime(booking.time)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#bbb]" />
                {locationLabel}
              </span>
            </div>

            {/* UX-M4: Show proposed reschedule date/time when RESCHEDULE_REQUESTED */}
            {booking.status === 'RESCHEDULE_REQUESTED' && booking.rescheduleDate && booking.rescheduleTime && (
              <p className="mt-1.5 text-xs text-purple-700 flex items-center gap-1">
                <RotateCcw className="h-3 w-3 flex-shrink-0" />
                Proposed: {longDate(booking.rescheduleDate)} at {formatTime(booking.rescheduleTime)}
              </p>
            )}

            {/* Cancellation window countdown for upcoming bookings */}
            {upcoming && (() => {
              const hoursToAppointment = (new Date(booking.date).getTime() - Date.now()) / 3_600_000
              if (hoursToAppointment > 0 && hoursToAppointment <= 48) {
                return (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    {hoursToAppointment > 24
                      ? `Free cancellation for ${Math.floor(hoursToAppointment - 24)}h more`
                      : 'Within 24h cancellation — 50% refund only'}
                  </p>
                )
              }
              return null
            })()}

            {/* Price line for completed */}
            {completed && (
              <p className="mt-1.5 text-sm font-medium text-[#1A1A1A]">
                {formatCurrency(booking.totalPrice)} paid
              </p>
            )}
          </div>

          {/* Right: actions */}
          {!cancelled && (
            <div className="flex flex-shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end sm:justify-start">
              {upcoming && (
                <>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="rounded-lg border border-[#1A1A1A] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333]"
                  >
                    Manage
                  </Link>
                  <Link
                    href={`/messages?bookingId=${booking.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message
                  </Link>
                  <div className="hidden items-center gap-3 sm:flex">
                    <button
                      onClick={() => onReschedule(booking)}
                      className="text-xs text-[#717171] transition-colors hover:text-[#1A1A1A]"
                    >
                      Reschedule
                    </button>
                    <span className="text-[#e8e1de]">·</span>
                    <button
                      onClick={() => onCancel(booking)}
                      className="text-xs text-red-400 transition-colors hover:text-red-600"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {completed && (
                <>
                  {!booking.review && (
                    <Link
                      href={`/reviews/new?bookingId=${booking.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
                    >
                      <Star className="h-3.5 w-3.5" /> Leave a review
                    </Link>
                  )}
                  <Link
                    href={`/book/${booking.provider.id}?service=${booking.service.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E96B56] hover:underline underline-offset-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Book again
                  </Link>
                  <button
                    onClick={() => onViewReceipt(booking)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    Receipt
                  </button>
                  {/* Dispute — visible within dispute window, hidden if already disputed */}
                  {!booking.dispute && booking.disputeDeadline && new Date() < new Date(booking.disputeDeadline) && (
                    <button
                      onClick={() => onDispute(booking)}
                      className="flex items-center gap-1.5 rounded-lg border border-orange-200 px-4 py-2 text-sm font-medium text-orange-600 transition-colors hover:border-orange-400 hover:text-orange-700"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Dispute
                    </button>
                  )}
                  {booking.dispute && (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium px-2 py-1">
                      <AlertTriangle className="h-3 w-3" />
                      Dispute {booking.dispute.status === 'OPEN' ? 'open' : booking.dispute.status.toLowerCase()}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: reschedule/cancel row for upcoming */}
      {upcoming && (
        <div className="mt-3 flex items-center gap-4 sm:hidden">
          <button
            onClick={() => onReschedule(booking)}
            className="text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            Reschedule
          </button>
          <span className="text-[#e8e1de]">·</span>
          <button
            onClick={() => onCancel(booking)}
            className="text-sm text-red-400 transition-colors hover:text-red-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Section ──────────────────────────────────────────────────────

function Section({
  title, subtitle, items, ctaLabel, ctaHref, onViewReceipt, onCancel, onReschedule, onDispute,
}: {
  title: string
  subtitle?: string
  items: CustomerBooking[]
  ctaLabel?: string
  ctaHref?: string
  onViewReceipt: (b: CustomerBooking) => void
  onCancel: (b: CustomerBooking) => void
  onReschedule: (b: CustomerBooking) => void
  onDispute: (b: CustomerBooking) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-12">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">{title}</h2>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="flex items-center gap-1 text-sm font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {subtitle && <p className="mb-4 text-sm text-[#aaa]">{subtitle}</p>}
      <div className="mt-4">
        {items.map(b => (
          <BookingCard key={b.id} booking={b} onViewReceipt={onViewReceipt} onCancel={onCancel} onReschedule={onReschedule} onDispute={onDispute} />
        ))}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────

function BookingHistoryPageInner() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const tabParam = searchParams.get('tab') as Filter | null
  const [filter, setFilter] = useState<Filter>(tabParam ?? 'all')
  const [receiptBooking, setReceiptBooking] = useState<CustomerBooking | null>(null)

  // Cancel flow
  const [cancelBooking, setCancelBooking] = useState<CustomerBooking | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Reschedule flow
  const [rescheduleBooking, setRescheduleBooking] = useState<CustomerBooking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [isRescheduling, setIsRescheduling] = useState(false)
  // UX-M5: available slots for the proposed reschedule date
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([])
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false)

  // Dispute flow
  const [disputeBooking, setDisputeBooking] = useState<CustomerBooking | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeEvidence, setDisputeEvidence] = useState('')
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Show success toast when redirected back after leaving a review
  useEffect(() => {
    if (searchParams.get('reviewed') === '1') {
      toast.success('Your review has been submitted! ✓')
      // Clean URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('reviewed')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings?role=customer')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBookings(data.bookings || [])
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchBookings()
  }, [status, fetchBookings])

  const handleCancelConfirm = useCallback(async () => {
    if (!cancelBooking) return
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${cancelBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED_BY_CUSTOMER' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel')
      }
      toast.success('Booking cancelled')
      setCancelBooking(null)
      fetchBookings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel booking')
    } finally {
      setIsCancelling(false)
    }
  }, [cancelBooking, fetchBookings])

  // UX-M5: fetch available slots for a proposed reschedule date
  const fetchRescheduleSlots = useCallback(async (bookingId: string, date: string) => {
    if (!date) { setRescheduleSlots([]); return }
    setLoadingRescheduleSlots(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule?date=${date}`)
      if (!res.ok) { setRescheduleSlots([]); return }
      const data = await res.json()
      setRescheduleSlots(data.availableSlots || [])
    } catch {
      setRescheduleSlots([])
    } finally {
      setLoadingRescheduleSlots(false)
    }
  }, [])

  const handleRescheduleConfirm = useCallback(async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) return
    setIsRescheduling(true)
    try {
      const res = await fetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rescheduleDate, time: rescheduleTime }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reschedule')
      }
      toast.success('Reschedule request sent — awaiting artist confirmation')
      setRescheduleBooking(null)
      setRescheduleDate('')
      setRescheduleTime('')
      setRescheduleSlots([])
      fetchBookings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reschedule booking')
    } finally {
      setIsRescheduling(false)
    }
  }, [rescheduleBooking, rescheduleDate, rescheduleTime, fetchBookings])

  const handleDisputeSubmit = useCallback(async () => {
    if (!disputeBooking || !disputeReason.trim()) return
    setIsSubmittingDispute(true)
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: disputeBooking.id,
          reason: disputeReason.trim(),
          evidence: disputeEvidence.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit dispute')
      toast.success('Dispute submitted — our team will review it within 48 hours.')
      setDisputeBooking(null)
      setDisputeReason('')
      setDisputeEvidence('')
      fetchBookings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit dispute')
    } finally {
      setIsSubmittingDispute(false)
    }
  }, [disputeBooking, disputeReason, disputeEvidence, fetchBookings])

  const counts = useMemo(() => ({
    all:       bookings.length,
    upcoming:  bookings.filter(isUpcoming).length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
    cancelled: bookings.filter(b => isCancelledStatus(b.status)).length,
  }), [bookings])

  const groups = useMemo(() => {
    const upcomingList    = [...bookings].filter(isUpcoming).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const allRecent       = [...bookings].filter(isRecentlyCompleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const completedRecent = allRecent.slice(0, 6)
    const recentIds       = new Set(allRecent.map(b => b.id))
    const upcomingIds     = new Set(upcomingList.map(b => b.id))
    const earlier         = [...bookings].filter(b => !recentIds.has(b.id) && !upcomingIds.has(b.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return { upcomingList, completedRecent, earlier, hasMoreRecent: allRecent.length > 6, totalRecent: allRecent.length }
  }, [bookings])

  const displayed = useMemo(() => {
    if (filter === 'upcoming')  return [...bookings].filter(isUpcoming).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (filter === 'completed') return [...bookings].filter(b => b.status === 'COMPLETED').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (filter === 'cancelled') return [...bookings].filter(b => isCancelledStatus(b.status)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return []
  }, [bookings, filter])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }
  if (status === 'unauthenticated') return null

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'upcoming',  label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const isEmpty = filter === 'all' ? bookings.length === 0 : displayed.length === 0

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">

        {/* Back */}
        <Link
          href="/dashboard/customer"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-headline text-[2.25rem] font-semibold leading-tight text-[#1A1A1A]">
            Your appointments
          </h1>
          <p className="mt-1.5 text-base text-[#717171]">
            {counts.all > 0
              ? `${counts.all} appointment${counts.all !== 1 ? 's' : ''}`
              : 'No appointments yet'}
          </p>
        </div>

        {/* Underline tabs */}
        <div className="mb-10 border-b border-[#ece6e2]">
          <div className="flex gap-0">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`relative pb-3 pr-6 text-sm font-medium transition-colors duration-150 ${
                  filter === t.key
                    ? 'text-[#1A1A1A]'
                    : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
              >
                {t.label}
                {!loading && (
                  <span className="ml-1.5 text-xs text-[#bbb]">
                    {counts[t.key]}
                  </span>
                )}
                {filter === t.key && (
                  <span className="absolute bottom-0 left-0 right-6 h-[2px] rounded-full bg-[#1A1A1A]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading — skeleton cards */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-[#e8e1de] p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#f3ece9] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#f3ece9] rounded w-1/3" />
                    <div className="h-3 bg-[#f3ece9] rounded w-1/2" />
                    <div className="h-3 bg-[#f3ece9] rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — cancelled tab */}
        {!loading && isEmpty && filter === 'cancelled' && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f3ece9] flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-[#E96B56]" />
            </div>
            <p className="font-semibold text-[#1A1A1A] mb-1">No cancelled bookings</p>
            <p className="text-sm text-[#717171]">All your bookings are in good shape.</p>
          </div>
        )}

        {/* Empty state — all other tabs */}
        {!loading && isEmpty && filter !== 'cancelled' && (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf6f4]">
              <CalendarDays className="h-7 w-7 text-[#E96B56]" />
            </div>
            <h3 className="font-headline text-xl font-semibold text-[#1A1A1A]">
              {filter === 'upcoming'  ? 'No upcoming appointments' :
               filter === 'completed' ? 'No completed appointments' :
               'No appointments yet'}
            </h3>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-[#717171]">
              {filter === 'upcoming'
                ? 'Book an artist and your upcoming appointments will appear here.'
                : 'When you complete bookings they will show up here.'}
            </p>
            {(filter === 'all' || filter === 'upcoming') && (
              <Link
                href="/search"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#E96B56] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#d45a45]"
              >
                Browse artists <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {/* All view — grouped */}
        {!loading && !isEmpty && filter === 'all' && (
          <div>
            <Section
              title="Upcoming"
              items={groups.upcomingList}
              onViewReceipt={setReceiptBooking}
              onCancel={setCancelBooking}
              onReschedule={b => { setRescheduleBooking(b); setRescheduleDate(''); setRescheduleTime(''); setRescheduleSlots([]) }}
              onDispute={setDisputeBooking}
            />

            <Section
              title="Recently completed"
              subtitle={groups.hasMoreRecent ? `Showing 6 of ${groups.totalRecent} · Last 30 days` : 'Last 30 days'}
              items={groups.completedRecent}
              ctaLabel={groups.hasMoreRecent ? `View all ${groups.totalRecent}` : undefined}
              ctaHref="/bookings?tab=completed"
              onViewReceipt={setReceiptBooking}
              onCancel={setCancelBooking}
              onReschedule={b => { setRescheduleBooking(b); setRescheduleDate(''); setRescheduleTime(''); setRescheduleSlots([]) }}
              onDispute={setDisputeBooking}
            />

            <Section
              title="Earlier"
              subtitle="Older than 30 days"
              items={groups.earlier}
              onViewReceipt={setReceiptBooking}
              onCancel={setCancelBooking}
              onReschedule={b => { setRescheduleBooking(b); setRescheduleDate(''); setRescheduleTime(''); setRescheduleSlots([]) }}
              onDispute={setDisputeBooking}
            />
          </div>
        )}

        {/* Filtered view */}
        {!loading && !isEmpty && filter !== 'all' && (
          <div>
            {displayed.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                onViewReceipt={setReceiptBooking}
                onCancel={setCancelBooking}
                onReschedule={b2 => { setRescheduleBooking(b2); setRescheduleDate(''); setRescheduleTime('') }}
                onDispute={setDisputeBooking}
              />
            ))}
          </div>
        )}

      </div>

      {receiptBooking && (
        <ReceiptModal booking={receiptBooking} onClose={() => setReceiptBooking(null)} />
      )}

      {/* ── Cancel confirmation modal ── */}
      {cancelBooking && (() => {
        const policyType: string = cancelBooking.provider?.providerProfile?.cancellationPolicyType ?? 'MODERATE'
        const policyLabel = policyType === 'FLEXIBLE' ? 'Flexible' : policyType === 'STRICT' ? 'Strict' : 'Moderate'
        const dateStr = typeof cancelBooking.date === 'string' ? cancelBooking.date.split('T')[0] : new Date(cancelBooking.date).toISOString().split('T')[0]
        const { message: refundMessage } = estimateRefund(cancelBooking.totalPrice, cancelBooking.tipAmount ?? 0, policyType, dateStr, cancelBooking.time)
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-headline text-xl text-[#1A1A1A] mb-2">Cancel appointment?</h3>
              <p className="text-sm text-[#717171] mb-4">
                Policy: <span className="font-semibold text-[#1A1A1A]">{policyLabel}</span>
              </p>
              <div className="bg-[#f9f2ef] rounded-xl px-4 py-3 mb-5">
                <p className="text-sm font-semibold text-[#1A1A1A]">{refundMessage}</p>
                <p className="text-xs text-[#717171] mt-1">Tip is always fully refunded.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancelBooking(null)} className="flex-1 border border-[#e8e1de] text-sm font-semibold text-[#1A1A1A] py-2.5 rounded-full hover:bg-[#f9f2ef] transition-colors">
                  Keep appointment
                </button>
                <button onClick={handleCancelConfirm} disabled={isCancelling} className="flex-1 bg-[#1A1A1A] text-white text-sm font-semibold py-2.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-50">
                  {isCancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dispute modal ── */}
      {disputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-50">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#1A1A1A]">Raise a dispute</h3>
                <p className="mt-0.5 text-sm text-[#717171]">
                  {disputeBooking.service.title} with {disputeBooking.provider.name}
                </p>
              </div>
              <button
                onClick={() => { setDisputeBooking(null); setDisputeReason(''); setDisputeEvidence('') }}
                className="flex-shrink-0 text-[#aaa] hover:text-[#717171]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A]">
                  What went wrong? <span className="text-red-500">*</span>
                </label>
                <select
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none bg-white"
                >
                  <option value="">Select a reason…</option>
                  <option value="Service not delivered as described">Service not delivered as described</option>
                  <option value="Artist did not show up">Artist did not show up</option>
                  <option value="Service quality was unacceptable">Service quality was unacceptable</option>
                  <option value="Wrong service performed">Wrong service performed</option>
                  <option value="Injury or damage occurred">Injury or damage occurred</option>
                  <option value="Charged incorrectly">Charged incorrectly</option>
                  <option value="Other issue">Other issue</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#1A1A1A]">
                  Additional details (optional)
                </label>
                <textarea
                  value={disputeEvidence}
                  onChange={e => setDisputeEvidence(e.target.value)}
                  rows={3}
                  placeholder="Describe what happened in more detail — this helps us resolve your dispute faster."
                  className="w-full resize-none rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] placeholder-[#aaa] focus:border-[#E96B56] focus:outline-none"
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-[#aaa]">
              Our trust &amp; safety team will review your dispute within 48 hours. The artist&apos;s payout will be held while it&apos;s open.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setDisputeBooking(null); setDisputeReason(''); setDisputeEvidence('') }}
                className="flex-1 rounded-xl border border-[#e8e1de] py-2.5 text-sm font-medium text-[#717171] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
              >
                Cancel
              </button>
              <button
                onClick={handleDisputeSubmit}
                disabled={isSubmittingDispute || !disputeReason}
                className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmittingDispute ? 'Submitting…' : 'Submit dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule modal ── */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-[#1A1A1A]">Reschedule appointment</h3>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="text-[#aaa] hover:text-[#717171]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-[#717171]">
              {rescheduleBooking.service.title} with {rescheduleBooking.provider.name}
            </p>
            {/* Within-24h reschedule warning */}
            {(() => {
              const bookingMs = new Date(`${rescheduleBooking.date.split('T')[0]}T${rescheduleBooking.time}:00`).getTime()
              const hoursUntil = (bookingMs - Date.now()) / (1000 * 60 * 60)
              return hoursUntil < 24 && hoursUntil > 0 ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 leading-snug">
                    Your appointment is within 24 hours. Rescheduling now requires the artist&apos;s approval and a cancellation fee may apply if declined.
                  </p>
                </div>
              ) : null
            })()}
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#717171]">New date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={e => {
                    const d = e.target.value
                    setRescheduleDate(d)
                    setRescheduleTime('')
                    // UX-M5: fetch real available slots for this date
                    if (rescheduleBooking && d) fetchRescheduleSlots(rescheduleBooking.id, d)
                  }}
                  className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none"
                />
              </div>
              {rescheduleDate && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#717171]">New time</label>
                  {loadingRescheduleSlots ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-[#717171]">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E96B56] border-t-transparent" />
                      Loading available times…
                    </div>
                  ) : rescheduleSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {rescheduleSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setRescheduleTime(slot)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            rescheduleTime === slot
                              ? 'border-[#E96B56] bg-[#E96B56] text-white'
                              : 'border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#E96B56]'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#717171] py-1">
                      No available times on this date. Please choose another day.
                    </p>
                  )}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-[#717171] leading-snug">
              Note: your reschedule request will be reviewed by the artist. They&apos;ll confirm if the time works.
            </p>
            <p className="mt-1.5 text-xs text-[#aaa]">
              Your original booking stays confirmed until they accept.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setRescheduleBooking(null)}
                className="flex-1 rounded-xl border border-[#e8e1de] py-2.5 text-sm font-medium text-[#717171] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleConfirm}
                disabled={isRescheduling || !rescheduleDate || !rescheduleTime}
                className="flex-1 rounded-xl bg-[#E96B56] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d45a45] disabled:opacity-60"
              >
                {isRescheduling ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookingHistoryPage() {
  return (
    <Suspense fallback={null}>
      <BookingHistoryPageInner />
    </Suspense>
  )
}
