'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Calendar, Clock, MapPin, AlertTriangle, Heart, Share2 } from 'lucide-react'
import type { CustomerBooking } from '@/types/dashboard'
import {
  getConfirmationMode,
  getConfirmationCopy,
  type ConfirmationMode,
} from '@/lib/booking-confirmation'
import { buildRetryBookingUrl } from '@/lib/booking-url-state'

function formatLocationType(locationType: string): string {
  if (locationType === 'AT_HOME') return 'At your location'
  if (locationType === 'STUDIO') return 'At the studio'
  return locationType
}

function ConfirmedContent() {
  const params = useParams()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<CustomerBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) return
    fetch(`/api/bookings/${bookingId}`)
      .then(res => {
        if (!res.ok) throw new Error('Booking not found')
        return res.json()
      })
      .then(data => {
        setBooking(data.booking ?? data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message ?? 'Something went wrong')
        setLoading(false)
      })
  }, [bookingId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <div className="w-full max-w-lg animate-pulse space-y-6">
          <div className="h-16 w-16 rounded-full bg-[#f3ece9] mx-auto" />
          <div className="h-8 w-48 rounded-lg bg-[#f3ece9] mx-auto" />
          <div className="h-40 rounded-2xl bg-[#f3ece9]" />
          <div className="h-32 rounded-2xl bg-[#f3ece9]" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-[#1A1A1A] font-headline text-xl mb-2">Booking not found</p>
          <p className="text-[#717171] font-jakarta text-sm mb-6">
            We couldn&apos;t load your booking details. It may have been cancelled or the link is incorrect.
          </p>
          <Link
            href="/bookings"
            className="inline-block bg-[#E96B56] text-white font-jakarta font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#a63a29] transition-colors"
          >
            View my bookings
          </Link>
        </div>
      </div>
    )
  }

  // UX-H4/BL-M2: Build dynamic accept deadline from booking.acceptDeadline
  // P2-D: Show exact day + time rather than a relative duration
  const acceptDeadlineText = (() => {
    const raw = (booking as unknown as Record<string, unknown>).acceptDeadline
    if (!raw || typeof raw !== 'string') return '24 hours'
    const deadline = new Date(raw)
    const now = new Date()
    const diffMs = deadline.getTime() - now.getTime()
    if (diffMs <= 0) return 'soon'
    // Format as "until Thursday 6pm" using Sydney time
    const formatted = deadline.toLocaleString('en-AU', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Sydney',
    })
    return `until ${formatted}`
  })()

  // AUDIT-005: resolve confirmation mode (confirmed / pending / failed) so the
  // hero + next-steps copy branch on the actual booking state instead of
  // always rendering "Booking request sent!".
  const paymentStatusRaw = (booking as unknown as Record<string, unknown>).paymentStatus
  const mode: ConfirmationMode = getConfirmationMode({
    status: booking.status,
    paymentStatus: typeof paymentStatusRaw === 'string' ? paymentStatusRaw : null,
  })
  // P1-6/UX-H3: keep a local alias so the existing failed-payment banner
  // logic (which wraps a dedicated retry CTA) stays readable.
  const paymentFailed = mode === 'failed'
  const copy = getConfirmationCopy({
    mode,
    artistFirstName: booking.provider.name?.split(' ')[0],
    acceptDeadlineText,
  })

  // AUDIT-007: Build a retry-payment URL that preserves everything we know
  // about this booking, so the user doesn't re-enter date/time/location/tip/
  // guests/voucher when retrying after a failed card. guestCount and
  // giftVoucherCode aren't on the public CustomerBooking shape so we read
  // them defensively from the raw API payload.
  //
  // NOTE: this still *creates a new booking* on submit. A safer path would
  // reuse the original PaymentIntent when Stripe already shows it as
  // succeeded (duplicate-charge defence) — flagged to the team as a
  // separate ticket rather than silently adjusting payment routing here.
  const rawBooking       = booking as unknown as Record<string, unknown>
  const retryGuestCount  = typeof rawBooking.guestCount === 'number' ? rawBooking.guestCount : undefined
  const retryVoucherCode = typeof rawBooking.giftVoucherCode === 'string' ? rawBooking.giftVoucherCode : undefined
  const retryBookingUrl  = buildRetryBookingUrl({
    providerId:      booking.provider.id,
    serviceId:       booking.service.id,
    date:            booking.date,
    time:            booking.time,
    locationType:    booking.locationType,
    tipAmount:       booking.tipAmount,
    guestCount:      retryGuestCount,
    giftVoucherCode: retryVoucherCode,
  })

  const icalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/calendar/ical/${bookingId}`

  // Build Google Calendar deep-link from booking data
  function buildGoogleCalUrl() {
    if (!booking) return '#'
    // Parse date + time in AEST (UTC+10) – format: 20260410T090000 (no Z = local)
    const [y, mo, d] = booking.date.split('-')
    const [hh, mm] = booking.time.split(':')
    const durationMin = booking.service?.duration ?? 60
    const startMins = parseInt(hh) * 60 + parseInt(mm)
    const endMins = startMins + durationMin
    const endH = Math.floor(endMins / 60).toString().padStart(2, '0')
    const endM = (endMins % 60).toString().padStart(2, '0')
    const startStr = `${y}${mo}${d}T${hh}${mm}00`
    const endStr = `${y}${mo}${d}T${endH}${endM}00`
    const title = encodeURIComponent(`${booking.service.title} with ${booking.provider.name}`)
    const location = encodeURIComponent(
      booking.locationType === 'AT_HOME' ? (booking.address ?? 'Your location') : 'Studio appointment'
    )
    const details = encodeURIComponent(`Booked via Sparq — ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://sparq.com.au'}/bookings`)
    return `https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${startStr}/${endStr}&location=${location}&details=${details}&ctz=Australia/Sydney`
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* P1-6/UX-H3: Failed payment banner */}
        {paymentFailed && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-jakarta font-semibold text-amber-800 text-sm mb-0.5">Payment failed — action required</p>
              <p className="font-jakarta text-amber-700 text-xs mb-3">
                We couldn&apos;t process your payment for this booking. Please update your payment method to keep the appointment.
              </p>
              <Link
                href={retryBookingUrl}
                className="inline-block bg-amber-600 text-white font-jakarta font-semibold text-xs px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Retry payment →
              </Link>
            </div>
          </div>
        )}

        {/* AUDIT-005: hero branches on confirmation mode (confirmed / pending / failed) */}
        <div className="text-center mb-10">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-5 ${copy.iconBgClass}`}>
            {copy.iconKey === 'check' && (
              <CheckCircle className={`w-9 h-9 ${copy.iconColorClass}`} strokeWidth={1.8} />
            )}
            {copy.iconKey === 'clock' && (
              <Clock className={`w-9 h-9 ${copy.iconColorClass}`} strokeWidth={1.8} />
            )}
            {copy.iconKey === 'alert' && (
              <AlertTriangle className={`w-9 h-9 ${copy.iconColorClass}`} strokeWidth={1.8} />
            )}
          </div>
          <h1 className="font-headline text-3xl text-[#1A1A1A] mb-2">
            {copy.headline}
          </h1>
          <p className="font-jakarta text-[#717171] text-sm">
            {copy.subtext}
          </p>
        </div>

        {/* Booking details card */}
        <div className="bg-white rounded-2xl border border-[#e8e1de] px-6 py-6 mb-6 space-y-4">
          <h2 className="font-headline text-lg text-[#1A1A1A]">{booking.service.title}</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f9f2ef] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-[#E96B56]" />
              </div>
              <div>
                <p className="font-jakarta text-xs text-[#717171]">Date</p>
                <p className="font-jakarta text-sm font-medium text-[#1A1A1A]">{booking.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f9f2ef] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#E96B56]" />
              </div>
              <div>
                <p className="font-jakarta text-xs text-[#717171]">Time</p>
                <p className="font-jakarta text-sm font-medium text-[#1A1A1A]">{booking.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f9f2ef] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#E96B56]" />
              </div>
              <div>
                <p className="font-jakarta text-xs text-[#717171]">Location</p>
                <p className="font-jakarta text-sm font-medium text-[#1A1A1A]">
                  {formatLocationType(booking.locationType)}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#e8e1de]">
            <p className="font-jakarta text-xs text-[#717171]">Artist</p>
            <p className="font-jakarta text-sm font-medium text-[#1A1A1A]">{booking.provider.name}</p>
          </div>
        </div>

        {/* AUDIT-005: next steps come from the copy bundle so they match the mode */}
        <div className="bg-white rounded-2xl border border-[#e8e1de] px-6 py-6 mb-6">
          <h2 className="font-headline text-base text-[#1A1A1A] mb-4">What happens next?</h2>
          <ol className="space-y-4">
            {copy.nextSteps.map(item => (
              <li key={item.step} className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-[#E96B56] text-white font-jakarta font-semibold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="font-jakarta text-sm font-semibold text-[#1A1A1A]">{item.title}</p>
                  <p className="font-jakarta text-xs text-[#717171] mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Calendar add options */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`webcal:${icalUrl}`}
              className="flex items-center justify-center gap-2 bg-white border border-[#e8e1de] text-[#1A1A1A] font-jakarta font-medium px-4 py-3 rounded-xl text-sm hover:border-[#E96B56] transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#717171]" />
              Apple Calendar
            </a>
            <a
              href={buildGoogleCalUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white border border-[#e8e1de] text-[#1A1A1A] font-jakarta font-medium px-4 py-3 rounded-xl text-sm hover:border-[#E96B56] transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#717171]" />
              Google Calendar
            </a>
          </div>

          <Link
            href="/bookings"
            className="flex items-center justify-center w-full bg-[#E96B56] text-white font-jakarta font-semibold px-5 py-4 rounded-xl text-sm hover:bg-[#a63a29] transition-colors"
          >
            View my bookings
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center w-full text-[#717171] font-jakarta text-sm py-3 hover:text-[#1A1A1A] transition-colors"
          >
            Back to home
          </Link>
        </div>

        {/* MON-R3: Post-booking upsell CTAs — save artist + share */}
        {!paymentFailed && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                try {
                  await fetch('/api/wishlists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ providerId: booking.provider.id }),
                  })
                } catch { /* silent */ }
              }}
              className="flex flex-col items-center justify-center gap-1.5 bg-white border border-[#e8e1de] rounded-2xl px-4 py-4 text-sm font-medium text-[#1A1A1A] hover:border-[#E96B56] hover:text-[#E96B56] transition-colors text-center"
            >
              <Heart className="h-5 w-5" />
              <span>Save {booking.provider.name?.split(' ')[0] ?? 'artist'}</span>
            </button>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/providers/${booking.provider.id}`
                if (navigator.share) {
                  await navigator.share({ title: `Check out ${booking.provider.name} on Sparq`, url }).catch(() => {})
                } else {
                  await navigator.clipboard.writeText(url).catch(() => {})
                }
              }}
              className="flex flex-col items-center justify-center gap-1.5 bg-white border border-[#e8e1de] rounded-2xl px-4 py-4 text-sm font-medium text-[#1A1A1A] hover:border-[#E96B56] hover:text-[#E96B56] transition-colors text-center"
            >
              <Share2 className="h-5 w-5" />
              <span>Share this artist</span>
            </button>
          </div>
        )}

        {/* MON-5: Premium membership upsell */}
        <div className="mt-8 bg-gradient-to-br from-[#1A1A1A] to-[#333] rounded-2xl px-6 py-6 text-white">
          <p className="font-jakarta text-xs font-semibold uppercase tracking-widest text-[#E96B56] mb-1">Sparq Premium</p>
          <h3 className="font-headline text-xl mb-2">Save on every booking</h3>
          <p className="font-jakarta text-sm text-white/70 mb-4">
            Premium members pay reduced booking fees, get early access to new artists, and unlock priority support.
          </p>
          <Link
            href="/dashboard/customer/settings?tab=membership"
            className="inline-block bg-[#E96B56] text-white font-jakarta font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#a63a29] transition-colors"
          >
            Learn more →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function BookingConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#f3ece9] animate-pulse" />
        </div>
      }
    >
      <ConfirmedContent />
    </Suspense>
  )
}
