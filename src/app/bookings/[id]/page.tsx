'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CalendarDays, Clock, MapPin, User, RotateCcw,
  AlertTriangle, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatTime } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────

interface BookingDetail {
  id: string
  date: string
  time: string
  locationType: string
  address: string | null
  status: string
  totalPrice: number
  platformFee: number
  tipAmount: number
  notes: string | null
  rescheduleDate: string | null
  rescheduleTime: string | null
  disputeDeadline: string | null
  createdAt: string
  service: {
    id: string
    title: string
    duration: number
    price: number
    category: string
    studioAddress?: string | null
  }
  provider: {
    id: string
    name: string
    image: string | null
    providerProfile?: { cancellationPolicyType: string } | null
  }
  customer: {
    id: string
    name: string
    image: string | null
  }
  review: {
    id: string
    rating: number
    text: string | null
  } | null
}

// ── Helpers ────────────────────────────────────────────────────────

function formatLongDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function isWithin30Days(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000 <= 30
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

type StatusConfig = { label: string; bg: string; text: string; dot: string }

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'PENDING':                return { label: 'Pending approval',      bg: 'bg-amber-50',    text: 'text-amber-700',  dot: 'bg-amber-400' }
    case 'CONFIRMED':              return { label: 'Confirmed',             bg: 'bg-green-50',    text: 'text-green-700',  dot: 'bg-green-500' }
    case 'COMPLETED':              return { label: 'Completed',             bg: 'bg-blue-50',     text: 'text-blue-700',   dot: 'bg-blue-500' }
    case 'DISPUTED':               return { label: 'Dispute open',          bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500' }
    case 'RESCHEDULE_REQUESTED':   return { label: 'Reschedule requested',  bg: 'bg-purple-50',   text: 'text-purple-700', dot: 'bg-purple-500' }
    case 'NO_SHOW':                return { label: 'No-show',               bg: 'bg-red-50',      text: 'text-red-600',    dot: 'bg-red-500' }
    case 'CANCELLED':
    case 'CANCELLED_BY_CUSTOMER':  return { label: status === 'CANCELLED_BY_CUSTOMER' ? 'Cancelled by you' : 'Cancelled', bg: 'bg-[#f5f5f5]', text: 'text-[#717171]', dot: 'bg-[#e8e1de]' }
    case 'CANCELLED_BY_PROVIDER':  return { label: 'Cancelled by artist',   bg: 'bg-red-50',      text: 'text-red-400',    dot: 'bg-red-400' }
    case 'DECLINED':               return { label: 'Declined',              bg: 'bg-[#f5f5f5]',   text: 'text-[#717171]',  dot: 'bg-[#e8e1de]' }
    case 'EXPIRED':                return { label: 'Expired',               bg: 'bg-[#f5f5f5]',   text: 'text-[#717171]',  dot: 'bg-[#e8e1de]' }
    case 'REFUNDED':               return { label: 'Refunded',              bg: 'bg-blue-50',     text: 'text-blue-600',   dot: 'bg-blue-400' }
    default:                       return { label: status,                  bg: 'bg-[#f5f5f5]',   text: 'text-[#717171]',  dot: 'bg-[#e8e1de]' }
  }
}

const CANCELLATION_POLICY_TEXT: Record<string, string> = {
  FLEXIBLE: 'Full refund if cancelled 24h before appointment.',
  MODERATE: 'Full refund if cancelled 48h before, 50% if less than 48h.',
  STRICT:   '50% refund if cancelled 7 days before, no refund within 7 days.',
}

// ── Loading skeleton ───────────────────────────────────────────────

function BookingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 h-4 w-28 animate-pulse rounded bg-[#e8e1de]" />
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 animate-pulse rounded-xl bg-[#f3ece9]" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-[#f3ece9]" />
              <div className="h-3 w-28 animate-pulse rounded bg-[#f3ece9]" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 animate-pulse rounded bg-[#f3ece9]" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

function BookingDetailContent() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookingId = params?.id as string

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return
    try {
      const res = await fetch(`/api/bookings/${bookingId}`)
      if (res.status === 404 || res.status === 403) { setNotFound(true); return }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBooking(data.booking)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    if (authStatus === 'unauthenticated') { router.push('/login'); return }
    if (authStatus === 'authenticated') fetchBooking()
  }, [authStatus, router, fetchBooking])

  async function handleCancel() {
    if (!booking) return
    if (!confirm('Are you sure you want to cancel this booking?')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED_BY_CUSTOMER' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel booking')
      }
      toast.success('Booking cancelled')
      await fetchBooking()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  if (authStatus === 'loading' || loading) return <BookingSkeleton />

  if (notFound || !booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] gap-4 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-[#f3ece9] flex items-center justify-center mb-2">
          <AlertTriangle className="w-6 h-6 text-[#E96B56]" />
        </div>
        <h1 className="font-headline text-2xl font-bold text-[#1A1A1A]">Booking not found</h1>
        <p className="text-[#717171]">This booking doesn&apos;t exist or you don&apos;t have access.</p>
        <Link href="/bookings" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#E96B56] hover:text-[#a63a29] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Bookings
        </Link>
      </div>
    )
  }

  const st = getStatusConfig(booking.status)
  const isOwnBooking = session?.user?.id === booking.customer.id
  const isPending   = booking.status === 'PENDING'
  const isConfirmed = booking.status === 'CONFIRMED'
  const isCompleted = booking.status === 'COMPLETED'
  const canCancel   = (isPending || isConfirmed || booking.status === 'RESCHEDULE_REQUESTED') && isOwnBooking
  const canReview   = isCompleted && !booking.review && isWithin30Days(booking.date) && isOwnBooking
  const disputeDeadline = booking.disputeDeadline ? new Date(booking.disputeDeadline) : null
  const disputeWindowOpen = disputeDeadline && disputeDeadline > new Date()

  // Price breakdown
  const tip          = booking.tipAmount ?? 0
  const platformFee  = booking.platformFee ?? 0
  const serviceBase  = booking.totalPrice - tip - platformFee
  const subtotal     = serviceBase + platformFee
  const total        = booking.totalPrice

  // Location display
  const isAtHome = booking.locationType === 'AT_HOME' || booking.locationType === 'MOBILE'
  const showAddress = (isPending || isConfirmed || isCompleted) && booking.address

  const dateLabel = formatLongDate(booking.date)
  const timeLabel = formatTime(booking.time)

  // Avatar initial fallback
  const providerInitial = booking.provider.name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-16">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">

        {/* Back link */}
        <Link
          href="/bookings"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My Bookings
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-[#1A1A1A] leading-tight">
              {booking.service.title}
            </h1>
            <p className="mt-1 text-sm text-[#717171]">Booking #{booking.id.slice(-8).toUpperCase()}</p>
          </div>
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${st.bg} ${st.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        </div>

        {/* ─── Artist + Service card ─── */}
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4 pb-5 border-b border-[#f0ebe7]">
            {/* Avatar */}
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#f3ece9]">
              {booking.provider.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.provider.image}
                  alt={booking.provider.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-xl font-semibold text-[#E96B56]">{providerInitial}</span>
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/providers/${booking.provider.id}`}
                className="font-semibold text-[#1A1A1A] hover:underline underline-offset-2 text-sm"
              >
                {booking.provider.name}
              </Link>
              <p className="mt-0.5 text-xs text-[#717171]">{booking.service.title}</p>
            </div>
            <Link
              href={`/providers/${booking.provider.id}`}
              className="flex-shrink-0 text-xs font-semibold text-[#E96B56] border border-[#E96B56]/30 px-3 py-1.5 rounded-full hover:bg-[#fdf0ed] transition-colors"
            >
              View profile
            </Link>
          </div>

          {/* Details grid */}
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 text-sm text-[#1A1A1A]">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#717171]" />
              <span>
                <span className="font-medium">{dateLabel}</span>
                <span className="text-[#717171]"> at {timeLabel}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#717171]">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{booking.service.duration} min</span>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#717171]" />
              <div>
                {isAtHome ? (
                  <>
                    <span className="text-[#1A1A1A] font-medium">Artist comes to you</span>
                    {showAddress ? (
                      <p className="mt-0.5 text-[#717171]">{booking.address}</p>
                    ) : isPending ? (
                      <p className="mt-0.5 text-[#717171] italic">Address shared once confirmed</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="text-[#1A1A1A] font-medium">Studio visit</span>
                    {booking.service.studioAddress && (
                      <p className="mt-0.5 text-[#717171]">{booking.service.studioAddress}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Reschedule proposed */}
            {booking.status === 'RESCHEDULE_REQUESTED' && booking.rescheduleDate && booking.rescheduleTime && (
              <div className="flex items-start gap-3 text-sm text-purple-700 rounded-xl bg-purple-50 px-3 py-2.5">
                <RotateCcw className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  <span className="font-medium">Reschedule proposed: </span>
                  {formatLongDate(booking.rescheduleDate)} at {formatTime(booking.rescheduleTime)}
                </span>
              </div>
            )}

            {/* Notes */}
            {booking.notes && (
              <div className="flex items-start gap-3 text-sm text-[#717171]">
                <User className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="italic">&ldquo;{booking.notes}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Price breakdown ─── */}
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[#1A1A1A]">Price breakdown</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-[#1A1A1A]">
              <span>{booking.service.title}</span>
              <span>{formatCurrency(serviceBase)}</span>
            </div>
            {platformFee > 0 && (
              <div className="flex justify-between text-[#717171]">
                <span>Booking fee</span>
                <span>{formatCurrency(platformFee)}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-[#717171]">
                <span>Tip</span>
                <span>{formatCurrency(tip)}</span>
              </div>
            )}
            <div className="pt-2.5 border-t border-[#f0ebe7] flex justify-between font-semibold text-[#1A1A1A]">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* ─── Actions ─── */}
        {(canCancel || canReview) && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            {canReview && (
              <Link
                href={`/reviews/new?bookingId=${booking.id}`}
                className="flex-1 rounded-xl bg-[#E96B56] py-3 text-center text-sm font-semibold text-white hover:bg-[#a63a29] transition-colors"
              >
                Leave a Review
              </Link>
            )}
            {canCancel && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-xl bg-[#E96B56] py-3 text-sm font-semibold text-white hover:bg-[#a63a29] transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Booking'}
                </button>
                {isConfirmed && (
                  <Link
                    href={`/bookings/${booking.id}/reschedule`}
                    className="flex-1 rounded-xl border border-[#1A1A1A]/20 py-3 text-center text-sm font-semibold text-[#1A1A1A] hover:border-[#1A1A1A]/40 transition-colors"
                  >
                    Request Reschedule
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Book again (UX-9) ─── */}
        {isCompleted && (
          <div className="mb-4">
            <Link
              href={`/book/${booking.provider.id}?service=${booking.service.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8e1de] px-4 py-2.5 text-sm font-medium text-[#717171] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Book again
            </Link>
          </div>
        )}

        {/* ─── Dispute window countdown ─── */}
        {isCompleted && disputeWindowOpen && disputeDeadline && (
          <p className="text-xs text-[#717171] mt-1 mb-3">
            Dispute available until {formatDate(disputeDeadline.toISOString())}
          </p>
        )}

        {/* ─── Cancellation policy ─── */}
        {(() => {
          const policyType = booking.provider.providerProfile?.cancellationPolicyType ?? 'MODERATE'
          const policyLabel =
            policyType === 'FLEXIBLE' ? 'Flexible' :
            policyType === 'STRICT'   ? 'Strict'   : 'Moderate'
          const badgeCls =
            policyType === 'FLEXIBLE' ? 'bg-emerald-100 text-emerald-700' :
            policyType === 'STRICT'   ? 'bg-red-100 text-red-700'         :
                                        'bg-amber-100 text-amber-700'
          return (
            <div className="rounded-2xl bg-[#f9f2ef] px-5 py-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#717171]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-[#1A1A1A]">Cancellation policy</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
                      {policyLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#717171] leading-relaxed">
                    {CANCELLATION_POLICY_TEXT[policyType] ?? CANCELLATION_POLICY_TEXT['MODERATE']}
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
    </div>}>
      <BookingDetailContent />
    </Suspense>
  )
}
