'use client'

/**
 * AUDIT-004
 *
 * Mini availability calendar that lives on the provider profile page, below
 * the "Choose a service" section.
 *
 * Goals:
 *   - Give clients a scannable overview of when the artist is free in the
 *     next ~60 days, rather than forcing them to open the booking flow
 *     just to check a date.
 *   - Let a click on an available day deep-link into the booking flow at
 *     Step 2 (When & where), with the date pre-selected — this is the
 *     contract established in AUDIT-006 (URL-param hydration).
 *
 * Availability source:
 *   GET /api/providers/[id]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   → { availableDates: string[] }   // up to 60 days per request
 *
 * Scope:
 *   - Two states: available (coral dot) and unavailable/past (muted).
 *   - No "limited" (yellow) tier — flagged in the Batch A summary as a
 *     follow-up once the API exposes slot-density info.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildBookingUrl } from '@/lib/booking-url-state'

interface AvailabilityCalendarProps {
  providerId: string
  /** First service ID — used to pre-select the service in the booking deep-link. */
  defaultServiceId?: string
  /** Artist's first name, used in the heading. */
  artistFirstName?: string
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function AvailabilityCalendar({
  providerId,
  defaultServiceId,
  artistFirstName,
}: AvailabilityCalendarProps) {
  const router = useRouter()
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => {
    const y = today.getFullYear()
    const m = today.getMonth()
    const d = today.getDate()
    return toDateStr(y, m, d)
  }, [today])

  // 180 days is the booking horizon enforced by the booking page; the
  // availability API clamps each request to 60, so we re-query per month.
  const maxDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 180)
    return d
  }, [])

  const [viewYear, setViewYear]   = useState<number>(today.getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth())
  const [availableDates, setAvailableDates] = useState<Set<string> | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const fetchMonth = useCallback(async (year: number, month: number) => {
    const from = toDateStr(year, month, 1)
    const to   = toDateStr(year, month, getDaysInMonth(year, month))
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/providers/${providerId}/availability?from=${from}&to=${to}`)
      if (!res.ok) {
        setAvailableDates(new Set())
        setError('Could not load availability — please try again.')
        return
      }
      const data = await res.json()
      setAvailableDates(new Set<string>(data.availableDates ?? []))
    } catch {
      setAvailableDates(new Set())
      setError('Could not load availability — please try again.')
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    fetchMonth(viewYear, viewMonth)
  }, [viewYear, viewMonth, fetchMonth])

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  // Disable "prev" when we're already at the current month.
  const atCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth()

  // Disable "next" once we'd go past the 180-day booking horizon.
  const nextMonthDate = new Date(viewYear, viewMonth + 1, 1)
  const atMaxMonth = nextMonthDate > maxDate

  const handleDateClick = (dateStr: string) => {
    // AUDIT-006 contract: the booking flow reads these params on mount.
    const url = buildBookingUrl(providerId, {
      serviceId:      defaultServiceId ?? null,
      date:           dateStr,
      time:           '',
      locationType:   '',
      tip:            0,
      guestCount:     1,
      selectedAddons: [],
      voucherInput:   '',
      promoCode:      '',
      step:           2, // Land on "When & where" with the date selected
    })
    router.push(url)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay    = getFirstDayOfMonth(viewYear, viewMonth)
  const monthName   = new Date(viewYear, viewMonth).toLocaleString('en-AU', {
    month: 'long',
    year: 'numeric',
  })

  const headingName = artistFirstName ? `${artistFirstName}'s availability` : 'Availability'

  return (
    <section aria-label="Availability calendar" className="py-8 border-b border-[#1A1A1A]/5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-headline text-xl text-[#1A1A1A]">{headingName}</h2>
        <span className="text-xs text-[#717171]">Tap a day to book</span>
      </div>

      <div className="rounded-2xl border border-[#e8e1de] bg-white p-5">
        {/* Month header with nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={atCurrentMonth}
            className="w-8 h-8 rounded-full border border-[#e8e1de] flex items-center justify-center text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-jakarta font-semibold text-sm text-[#1A1A1A]">
            {monthName}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={atMaxMonth}
            className="w-8 h-8 rounded-full border border-[#e8e1de] flex items-center justify-center text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_LABELS.map((d, i) => (
            <div
              key={i}
              className="text-center text-xs font-semibold text-[#717171]"
              aria-hidden="true"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1" role="grid" aria-busy={loading}>
          {/* Leading blanks for the first week */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`blank-${i}`} aria-hidden="true" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = toDateStr(viewYear, viewMonth, day)
            const isPast = dateStr < todayStr
            const isBeyondMax = new Date(dateStr + 'T12:00:00') > maxDate
            const isAvailable =
              !isPast && !isBeyondMax && availableDates?.has(dateStr) === true
            const isToday = dateStr === todayStr

            const baseClasses =
              'relative aspect-square flex items-center justify-center rounded-full text-sm font-jakarta transition-colors'

            if (isPast || isBeyondMax) {
              return (
                <div
                  key={dateStr}
                  className={`${baseClasses} text-[#e8e1de] cursor-not-allowed`}
                  aria-disabled="true"
                  role="gridcell"
                >
                  {day}
                </div>
              )
            }

            if (!isAvailable) {
              return (
                <div
                  key={dateStr}
                  className={`${baseClasses} text-[#717171] cursor-not-allowed`}
                  aria-label={`${dateStr} — unavailable`}
                  aria-disabled="true"
                  role="gridcell"
                >
                  {day}
                </div>
              )
            }

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDateClick(dateStr)}
                className={`${baseClasses} text-[#1A1A1A] hover:bg-[#E96B56] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E96B56] focus:ring-offset-1 ${
                  isToday ? 'ring-1 ring-[#E96B56]/40' : ''
                }`}
                aria-label={`${dateStr} — available, tap to book`}
                role="gridcell"
              >
                <span className="relative">
                  {day}
                  <span
                    className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-1 h-1 rounded-full bg-[#E96B56]"
                    aria-hidden="true"
                  />
                </span>
              </button>
            )
          })}
        </div>

        {/* Legend / status */}
        <div className="mt-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-[#717171]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E96B56]" /> Available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8e1de]" /> Unavailable
            </span>
          </div>
          {loading && <span className="text-[#717171]">Loading…</span>}
          {error && !loading && <span className="text-[#a63a29]">{error}</span>}
        </div>
      </div>
    </section>
  )
}
