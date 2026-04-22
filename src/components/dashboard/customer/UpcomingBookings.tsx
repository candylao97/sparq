'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, MapPin, MessageSquare, Zap, CalendarClock, XCircle } from 'lucide-react'
import { BookingStatusPill } from '@/components/providers/BookingStatusPill'
import { AiText } from '../AiText'
import { RescheduleModal } from '@/components/booking/RescheduleModal'
import { formatDate, formatTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { CustomerBooking } from '@/types/dashboard'

function getCountdownLabel(dateStr: string, time: string): string {
  const bookingDate = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const bookingDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate())
  const diffDays = Math.round((bookingDay.getTime() - todayStart.getTime()) / 86400000)
  if (diffDays === 0) return `Today at ${formatTime(time)}`
  if (diffDays === 1) return `Tomorrow at ${formatTime(time)}`
  if (diffDays <= 7) return `In ${diffDays} days`
  return formatDate(dateStr)
}

interface Props {
  bookings: CustomerBooking[]
  nextBookingSummary: string | null | undefined
  aiLoading: boolean
  onRefresh?: () => void
}

export function UpcomingBookings({ bookings, nextBookingSummary, aiLoading, onRefresh }: Props) {
  const next = bookings[0]
  const rest = bookings.slice(1, 6)

  const [rescheduleTarget, setRescheduleTarget] = useState<CustomerBooking | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking? You can always rebook later.')) return
    setCancellingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Your booking has been cancelled.')
      onRefresh?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'We couldn\u2019t cancel this booking. Please try again.'
      toast.error(message)
    } finally {
      setCancellingId(null)
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="mb-6 overflow-hidden rounded-2xl bg-[#1A1A1A]">
        <div className="relative p-8 text-center sm:p-10">
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(233,107,86,0.18)_0%,transparent_70%)]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(233,107,86,0.12)_0%,transparent_70%)]" />
          <div className="relative">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#E96B56]">Your calendar is clear</p>
            <h2 className="font-headline mb-2 text-2xl font-bold text-white sm:text-3xl">
              Ready for your next appointment?
            </h2>
            <p className="mb-6 text-sm text-white/50">Browse nail artists and lash techs near you — book in minutes.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/search?category=NAILS">
                <button className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] transition-all hover:-translate-y-0.5 hover:shadow-md">
                  Nail artists
                </button>
              </Link>
              <Link href="/search?category=LASHES">
                <button className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] transition-all hover:-translate-y-0.5 hover:shadow-md">
                  Lash techs
                </button>
              </Link>
              <Link href="/search">
                <button className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.18]">
                  Browse all
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Hero card */}
      <div className="relative mb-3 overflow-hidden rounded-2xl bg-[#1A1A1A] p-6 sm:p-8">
        <div className="absolute -right-10 -top-14 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(212,130,10,0.25)_0%,transparent_70%)]" />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="mb-3 flex items-center gap-1.5 text-label font-semibold uppercase tracking-wider text-[#E96B56]">
              <Zap className="h-3.5 w-3.5" /> Next up
            </p>

            {/* Talent chip */}
            <div className="mb-3 flex w-fit items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-label font-bold text-white">
                {next.provider.name.charAt(0)}
              </div>
              <span className="text-body-compact font-medium text-white/85">
                {next.provider.name}
              </span>
            </div>

            <h2 className="mb-2.5 text-xl font-bold text-white sm:text-2xl">
              {next.service.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-body-compact text-white/60">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {getCountdownLabel(next.date, next.time)}
              </span>
              {next.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {next.locationType === 'AT_HOME' ? 'Your place' : next.address}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {next.service.duration} mins
              </span>
            </div>

            <AiText text={nextBookingSummary} loading={aiLoading} className="mt-3 text-xs text-white/50" skeletonWidth="w-72" />
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2.5">
            <Link href={`/messages?bookingId=${next.id}`}>
              <button className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-body-compact font-semibold text-[#1A1A1A] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </button>
            </Link>
            <button
              onClick={() => setRescheduleTarget(next)}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-body-compact font-medium text-white transition-colors hover:bg-white/[0.18]"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Reschedule
            </button>
            <button
              onClick={() => handleCancel(next.id)}
              disabled={cancellingId === next.id}
              className="flex items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-body-compact font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Remaining upcoming */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map(booking => (
            <div key={booking.id} className="flex items-center gap-4 rounded-xl bg-white p-3 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <Calendar className="h-4 w-4 text-amber-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-compact font-semibold text-[#1A1A1A]">
                  {booking.service.title}
                  <span className="font-normal text-[#717171]"> · {booking.provider.name}</span>
                </p>
                <p className="text-label text-[#717171]">{getCountdownLabel(booking.date, booking.time)}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={() => setRescheduleTarget(booking)}
                  className="rounded-lg p-1.5 text-[#717171] transition-colors hover:bg-amber-50 hover:text-[#E96B56]"
                  title="Reschedule"
                >
                  <CalendarClock className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancellingId === booking.id}
                  className="rounded-lg p-1.5 text-[#717171] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  title="Cancel"
                >
                  <XCircle className="h-4 w-4" />
                </button>
                <BookingStatusPill status={booking.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <RescheduleModal
          open={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          bookingId={rescheduleTarget.id}
          currentDate={formatDate(rescheduleTarget.date)}
          currentTime={rescheduleTarget.time}
          serviceTitle={rescheduleTarget.service.title}
          onSuccess={() => onRefresh?.()}
        />
      )}
    </div>
  )
}
