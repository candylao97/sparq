'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sparkles      from 'lucide-react/dist/esm/icons/sparkles'
import ArrowRight    from 'lucide-react/dist/esm/icons/arrow-right'
import Home          from 'lucide-react/dist/esm/icons/home'
import Building2     from 'lucide-react/dist/esm/icons/building-2'
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock'
import CalendarPlus  from 'lucide-react/dist/esm/icons/calendar-plus'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import MapPin        from 'lucide-react/dist/esm/icons/map-pin'
import Loader2       from 'lucide-react/dist/esm/icons/loader-2'
import { ReceiptText, X } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import type { CustomerBooking } from '@/types/dashboard'
import { ReceiptModal } from './ReceiptModal'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getTimeLabel(dateStr: string, time: string): string {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const bookingStart = new Date(dateStr)
  bookingStart.setHours(0, 0, 0, 0)
  const diffDays = Math.round((bookingStart.getTime() - todayStart.getTime()) / 86400000)
  const t = formatTime(time)
  if (diffDays === 0) return `Today · ${t}`
  if (diffDays === 1) return `Tomorrow · ${t}`
  if (diffDays <= 6)  return `In ${diffDays} days · ${t}`
  return bookingStart.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${t}`
}

function getCountdown(dateStr: string, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const bookingDate = new Date(dateStr)
  bookingDate.setHours(h, m, 0, 0)
  const diffMs = bookingDate.getTime() - Date.now()
  if (diffMs <= 0) return 'Starting now'
  const diffHours = Math.floor(diffMs / 3_600_000)
  if (diffHours < 1) return 'Less than an hour away'
  if (diffHours < 24) return `${diffHours}h to go`
  const diffDays = Math.floor(diffMs / 86_400_000)
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} away`
}

function getEmotionalStatus(isConfirmed: boolean, dateStr: string, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const bookingDate = new Date(dateStr)
  bookingDate.setHours(h, m, 0, 0)
  const diffHours = (bookingDate.getTime() - Date.now()) / 3_600_000
  if (!isConfirmed) return 'Awaiting confirmation'
  if (diffHours < 3) return 'Almost time!'
  if (diffHours < 24) return 'Today is the day!'
  if (diffHours < 48) return 'Coming up tomorrow'
  return "You're all set"
}

function buildCalendarUrl(booking: CustomerBooking): string {
  const [h, m] = booking.time.split(':').map(Number)
  const start = new Date(booking.date)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + booking.service.duration * 60_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${booking.service.title} with ${booking.provider.name}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: 'Booked via Sparq',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function getNextAvailability(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const daysOut = (hash % 4) + 1
  const target = new Date()
  target.setDate(target.getDate() + daysOut)
  return target.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
}

const NAIL_IMAGES = [
  'https://images.unsplash.com/photo-1604655855317-b81ed9b3c46c',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b',
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371',
]
const LASH_IMAGES = [
  'https://images.unsplash.com/photo-1583001931096-959e9a1a6223',
  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b',
]

function getServiceImage(serviceTitle: string, id: string) {
  const isLash = /lash/i.test(serviceTitle)
  const pool = isLash ? LASH_IMAGES : NAIL_IMAGES
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return `${pool[hash % pool.length]}?auto=format&fit=crop&w=240&h=240&q=80`
}

function StarRow({ rating }: { rating: number }) {
  const starPath = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.min(1, Math.max(0, rating - (i - 1)))
        return (
          <span key={i} className="relative inline-block h-3 w-3">
            <svg className="h-3 w-3 text-[#e8e1de]" viewBox="0 0 20 20" fill="currentColor">
              <path d={starPath} />
            </svg>
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d={starPath} />
                </svg>
              </span>
            )}
          </span>
        )
      })}
      <span className="ml-1 text-[11px] font-semibold text-[#1A1A1A]">{rating.toFixed(1)}</span>
    </span>
  )
}

// ── Props ──────────────────────────────────────────────────────────

interface Props {
  firstName: string
  userRole: string
  upcomingBookings: CustomerBooking[]
  lastBooking: CustomerBooking | null
  daysSinceLastBooking: number | null
  lastProviderRating?: number | null
  lastProviderVisitCount?: number
  onRefresh?: () => void
}

// ── Time slots for reschedule ──────────────────────────────────────

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00',
]

function fmtSlot(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

function minDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// ── Upcoming card ──────────────────────────────────────────────────

function UpcomingCard({ booking, onRefresh }: { booking: CustomerBooking; onRefresh?: () => void }) {
  const [mode, setMode] = useState<'idle' | 'receipt' | 'reschedule' | 'cancel'>('idle')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('10:00')
  const [loading, setLoading] = useState(false)

  const timeLabel = getTimeLabel(booking.date, booking.time)
  const isToday = timeLabel.startsWith('Today')
  const isTomorrow = timeLabel.startsWith('Tomorrow')
  const isConfirmed = booking.status === 'CONFIRMED'
  const countdown = getCountdown(booking.date, booking.time)
  const emotionalStatus = getEmotionalStatus(isConfirmed, booking.date, booking.time)
  const calendarUrl = buildCalendarUrl(booking)
  const locationLabel = booking.locationType === 'MOBILE' || booking.locationType === 'AT_HOME'
    ? `At home${booking.address ? ` · ${booking.address}` : ''}`
    : booking.locationType === 'STUDIO'
    ? `Studio${booking.provider.suburb ? ` · ${booking.provider.suburb}` : ''}`
    : booking.address || booking.provider.suburb || 'Location TBC'

  const isAtHome = booking.locationType === 'MOBILE' || booking.locationType === 'AT_HOME'

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED_BY_CUSTOMER' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Booking cancelled')
      setMode('idle')
      onRefresh?.()
    } catch {
      toast.error('Could not cancel booking')
    } finally {
      setLoading(false)
    }
  }

  async function handleReschedule() {
    if (!rescheduleDate) { toast.error('Please select a date'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rescheduleDate, time: rescheduleTime }),
      })
      if (!res.ok) throw new Error()
      toast.success('Booking rescheduled')
      setMode('idle')
      onRefresh?.()
    } catch {
      toast.error('Could not reschedule booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={`overflow-hidden rounded-2xl border ${isToday ? 'border-[#E96B56]/30 bg-[#fdf6f4]' : 'border-[#e8e1de] bg-white'} shadow-[0_1px_6px_rgba(0,0,0,0.06)]`}>

        {/* Main info */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#f3ece9]">
              <img
                src={getServiceImage(booking.service.title, booking.provider.id)}
                alt={booking.service.title}
                className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            <div className="min-w-0 flex-1">
              {/* Time + countdown */}
              <div className="flex items-center gap-2">
                <p className={`whitespace-nowrap text-xs font-bold uppercase tracking-widest ${isToday || isTomorrow ? 'text-[#E96B56]' : 'text-[#717171]'}`}>
                  {timeLabel}
                </p>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${isToday ? 'bg-[#fdf1ef] text-[#E96B56]' : 'bg-[#f3ece9] text-[#717171]'}`}>
                  {countdown}
                </span>
              </div>
              {/* Emotional status */}
              <p className={`mt-0.5 text-[11px] font-semibold ${isConfirmed ? 'text-[#1A1A1A]' : 'text-amber-600'}`}>
                {emotionalStatus}
              </p>
              <p className="mt-1 truncate text-[0.95rem] font-bold text-[#1A1A1A]">
                {booking.service.title}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-sm text-[#717171]">{booking.provider.name}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-xs text-[#717171]">
                {isAtHome ? <Home className="h-3 w-3 flex-shrink-0" /> : <Building2 className="h-3 w-3 flex-shrink-0" />}
                <span className="truncate">{locationLabel}</span>
              </div>
            </div>

            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              isConfirmed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {isConfirmed ? 'Confirmed' : 'Pending'}
            </span>
          </div>
        </div>

        {/* ── Reschedule panel ── */}
        {mode === 'reschedule' && (
          <div className="border-t border-[#f3ece9] bg-[#fafafa] px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#1A1A1A]">Pick a new date & time</p>
              <button onClick={() => setMode('idle')} className="text-[#717171] hover:text-[#1A1A1A]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                min={minDate()}
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="flex-1 rounded-xl border border-[#e8e1de] px-3 py-2 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
              />
              <select
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="rounded-xl border border-[#e8e1de] px-3 py-2 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{fmtSlot(t)}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setMode('idle')} className="flex-1 rounded-xl border border-[#e8e1de] py-2 text-xs font-medium text-[#717171] hover:bg-white transition-colors">
                Cancel
              </button>
              <button onClick={handleReschedule} disabled={loading || !rescheduleDate} className="flex-1 rounded-xl bg-[#1A1A1A] py-2 text-xs font-semibold text-white hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm reschedule
              </button>
            </div>
          </div>
        )}

        {/* ── Cancel confirm panel ── */}
        {mode === 'cancel' && (
          <div className="border-t border-[#f3ece9] bg-[#fff8f7] px-5 py-4">
            <p className="text-sm font-semibold text-[#1A1A1A]">Cancel this booking?</p>
            <p className="mt-0.5 text-xs text-[#717171]">This action cannot be undone. The artist will be notified.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setMode('idle')} className="flex-1 rounded-xl border border-[#e8e1de] py-2 text-xs font-medium text-[#717171] hover:bg-white transition-colors">
                Keep booking
              </button>
              <button onClick={handleCancel} disabled={loading} className="flex-1 rounded-xl bg-[#E96B56] py-2 text-xs font-semibold text-white hover:bg-[#d4604c] transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                Yes, cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        {mode === 'idle' && (
          <div className="border-t border-[#f3ece9]">
            {/* Primary row: Message + Calendar */}
            <div className="flex items-center gap-2 px-4 py-3">
              <Link
                href={`/messages?bookingId=${booking.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#e8e1de] py-2 text-xs font-semibold text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Message artist
              </Link>
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1A1A1A] py-2 text-xs font-semibold text-white hover:bg-[#333] transition-colors"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Add to calendar
              </a>
            </div>
            {/* Secondary row: receipt · reschedule · cancel */}
            <div className="flex items-center gap-2 border-t border-[#f3ece9] px-4 py-2.5">
              <button
                onClick={() => setMode('receipt')}
                className="flex items-center gap-1.5 rounded-lg bg-[#f9f2ef] px-3 py-1.5 text-xs font-medium text-[#717171] hover:bg-[#f3ece9] hover:text-[#1A1A1A] transition-colors"
              >
                <ReceiptText className="h-3.5 w-3.5" />
                Receipt
              </button>
              <button
                onClick={() => setMode('reschedule')}
                className="flex items-center gap-1.5 rounded-lg bg-[#f9f2ef] px-3 py-1.5 text-xs font-medium text-[#717171] hover:bg-[#f3ece9] hover:text-[#1A1A1A] transition-colors"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Reschedule
              </button>
              <button
                onClick={() => setMode('cancel')}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors ml-auto"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt modal */}
      {mode === 'receipt' && (
        <ReceiptModal booking={booking} onClose={() => setMode('idle')} />
      )}
    </>
  )
}

// ── Component ──────────────────────────────────────────────────────

export function DashboardHero({
  firstName, userRole, upcomingBookings, lastBooking, daysSinceLastBooking, lastProviderRating, lastProviderVisitCount = 1, onRefresh
}: Props) {
  const [receiptOpen, setReceiptOpen] = useState(false)
  const hasUpcoming = upcomingBookings.length > 0
  const hasLastBooking = !!lastBooking
  const noHistory = !hasUpcoming && !lastBooking

  const isDueForRefresh = daysSinceLastBooking !== null && daysSinceLastBooking >= 14

  return (
    <div className="mb-10">

      {/* Role switcher */}
      {(userRole === 'BOTH' || userRole === 'ADMIN') && (
        <div className="mb-4">
          <Link
            href="/dashboard/provider"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Switch to artist view
          </Link>
        </div>
      )}

      {/* Greeting */}
      <h1 className="mb-4 text-[2rem] font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-[2.25rem]">
        {getGreeting()}, {firstName}.
      </h1>

      {/* Quick action row */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
        >
          Find a new artist
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
        >
          Browse artists
        </Link>
        <Link
          href="/nearby"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
        >
          <MapPin className="h-3 w-3" />
          Browse nearby
        </Link>
        <Link
          href="/dashboard/customer/settings"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-xs font-medium text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
        >
          Account settings
        </Link>
      </div>

      {/* ── Upcoming section ── */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[0.95rem] font-semibold text-[#1A1A1A]">Upcoming</h2>
            {hasUpcoming && (
              <span className="rounded-full bg-[#E96B56] px-2 py-0.5 text-[10px] font-bold text-white">
                {upcomingBookings.length}
              </span>
            )}
          </div>
          {hasUpcoming && (
            <Link
              href="/bookings?tab=upcoming"
              className="flex items-center gap-0.5 text-xs font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {hasUpcoming ? (
          <div className="space-y-3">
            {upcomingBookings.slice(0, 3).map(b => (
              <UpcomingCard key={b.id} booking={b} onRefresh={onRefresh} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e8e1de] p-8 text-center">
            <p className="text-[#1A1A1A] font-semibold mb-1">Nothing booked yet</p>
            <p className="text-sm text-[#717171] mb-4">Find an artist and book your next appointment.</p>
            <Link href="/search" className="inline-flex items-center gap-2 bg-[#E96B56] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#d45a45] transition-colors">
              Find an artist
            </Link>
          </div>
        )}
      </div>

      {/* ── Last booked section ── */}
      {hasLastBooking && lastBooking && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[0.95rem] font-semibold text-[#1A1A1A]">Continue your routine</p>
              <p className="mt-0.5 text-[11px] text-[#717171]">Artists you&apos;ve visited before</p>
            </div>
            <Link href="/bookings" className="flex items-center gap-0.5 text-xs font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e8e1de] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="flex gap-4 p-5">
              <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-[#f3ece9] sm:h-20 sm:w-20">
                <img
                  src={getServiceImage(lastBooking.service.title, lastBooking.provider.id)}
                  alt={lastBooking.service.title}
                  className="h-full w-full object-cover"
                  onError={e => {
                    const img = e.target as HTMLImageElement
                    if (lastBooking.provider.image) {
                      img.src = lastBooking.provider.image
                    } else {
                      img.style.display = 'none'
                    }
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                {/* Service + provider */}
                <p className="truncate text-[0.95rem] font-bold text-[#1A1A1A]">
                  {lastBooking.service.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-sm text-[#717171]">{lastBooking.provider.name}</p>
                </div>

                {/* Relationship signals */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {lastProviderVisitCount > 1 && (
                    <span className="rounded-full bg-[#f3ece9] px-2.5 py-1 text-[10px] font-semibold text-[#1A1A1A]">
                      Visited {lastProviderVisitCount}×
                    </span>
                  )}
                  {daysSinceLastBooking !== null && (
                    <span className="rounded-full bg-[#f3ece9] px-2.5 py-1 text-[10px] font-medium text-[#717171]">
                      Last booked {daysSinceLastBooking}d ago
                    </span>
                  )}
                  {isDueForRefresh && (
                    <span className="rounded-full bg-[#fdf1ef] px-2.5 py-1 text-[10px] font-semibold text-[#E96B56]">
                      Due for a refresh
                    </span>
                  )}
                </div>

                {/* Rating + price */}
                {(lastProviderRating && lastProviderRating > 0 || lastBooking.totalPrice > 0) && (
                  <div className="mt-2 flex items-center gap-3">
                    {lastProviderRating && lastProviderRating > 0 && (
                      <StarRow rating={lastProviderRating} />
                    )}
                    {lastBooking.totalPrice > 0 && (
                      <span className="text-xs font-semibold text-[#1A1A1A]">${lastBooking.totalPrice}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#f3ece9]">
              {/* Primary CTA row */}
              <div className="flex items-center justify-between px-5 py-3">
                <p className="flex items-center gap-1.5 text-xs text-[#717171]">
                  <span className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                  Avail. {getNextAvailability(lastBooking.provider.id)}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/providers/${lastBooking.provider.id}`}
                    className="text-xs font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors"
                  >
                    View profile
                  </Link>
                  <Link
                    href={`/book/${lastBooking.provider.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#E96B56] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#d4604c]"
                  >
                    Rebook this service <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              {/* Secondary: receipt */}
              <div className="flex items-center border-t border-[#f3ece9] px-5 py-2.5">
                <button
                  onClick={() => setReceiptOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-[#717171] hover:text-[#1A1A1A] transition-colors"
                >
                  <ReceiptText className="h-3 w-3 text-[#E96B56]" />
                  View receipt
                </button>
                <span className="ml-3 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  Paid
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── No history state ── */}
      {noHistory && (
        <div className="rounded-2xl border border-[#e8e1de] bg-white px-5 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E96B56]">Discover</p>
          <h2 className="mt-1 text-[0.95rem] font-bold text-[#1A1A1A]">Find your go-to artist.</h2>
          <p className="mt-1 text-sm text-[#717171]">Browse nail artists and lash techs near you.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/search?category=NAILS" className="rounded-full bg-[#E96B56] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d4604c] transition-colors">
              Nail artists →
            </Link>
            <Link href="/search?category=LASHES" className="rounded-full border border-[#e8e1de] px-4 py-2 text-xs font-medium text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
              Lash techs
            </Link>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receiptOpen && lastBooking && (
        <ReceiptModal booking={lastBooking} onClose={() => setReceiptOpen(false)} />
      )}
    </div>
  )
}
