'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CalendarDays, Clock, ChevronLeft, ChevronRight,
  Ban, RotateCcw, Palmtree, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatTime } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Constants ──────────────────────────────────────────────────────────────

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat. Map our index (0=Mon) to JS day:
const INDEX_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0]

const DEFAULT_HOURS: Record<number, { enabled: boolean; slots: string[] }> = {
  0: { enabled: true, slots: [...TIME_SLOTS] },  // Mon
  1: { enabled: true, slots: [...TIME_SLOTS] },  // Tue
  2: { enabled: true, slots: [...TIME_SLOTS] },  // Wed
  3: { enabled: true, slots: [...TIME_SLOTS] },  // Thu
  4: { enabled: true, slots: [...TIME_SLOTS] },  // Fri
  5: { enabled: false, slots: [] },               // Sat
  6: { enabled: false, slots: [] },               // Sun
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function getCalendarDays(year: number, month: number): Array<{ date: Date; inMonth: boolean }> {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Adjust for Monday start (0=Mon in our grid)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: Array<{ date: Date; inMonth: boolean }> = []

  // Leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, inMonth: false })
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true })
  }

  // Trailing days to fill 6 rows (42 cells) or at least complete the row
  while (days.length % 7 !== 0) {
    const nextDate = new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1)
    days.push({ date: nextDate, inMonth: false })
  }

  return days
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Override {
  date: string
  timeSlots: string[]
  isBlocked: boolean
}

interface BookedSlot {
  date: string
  time: string
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Weekly defaults: index 0=Mon, 1=Tue, ..., 6=Sun
  const [weekly, setWeekly] = useState<Record<number, { enabled: boolean; slots: string[] }>>({ ...DEFAULT_HOURS })
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map())
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([])

  const [loading, setLoading] = useState(true)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [savingDate, setSavingDate] = useState(false)
  const [defaultsDirty, setDefaultsDirty] = useState(false)

  // Calendar state
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  // Modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalSlots, setModalSlots] = useState<string[]>([])
  const [modalBlocked, setModalBlocked] = useState(false)

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role === 'CUSTOMER') router.push('/dashboard/customer')
  }, [status, session, router])

  // Fetch availability data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/provider/availability')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      // Map weekly defaults from API (keyed by JS day-of-week) to our index
      const newWeekly = { ...DEFAULT_HOURS }
      for (const [jsDayStr, val] of Object.entries(data.weeklyDefaults as Record<string, { timeSlots: string[]; isBlocked: boolean }>)) {
        const jsDay = Number(jsDayStr)
        // Convert JS day (0=Sun,1=Mon,...) to our index (0=Mon,...,6=Sun)
        const idx = jsDay === 0 ? 6 : jsDay - 1
        newWeekly[idx] = {
          enabled: !val.isBlocked,
          slots: val.timeSlots,
        }
      }
      setWeekly(newWeekly)

      // Map overrides
      const overrideMap = new Map<string, Override>()
      for (const o of data.overrides as Override[]) {
        overrideMap.set(o.date, o)
      }
      setOverrides(overrideMap)

      setBookedSlots(data.bookedSlots || [])
    } catch (err) {
      console.error('fetchData error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  // ─── Weekly defaults handlers ─────────────────────────────────────────────

  const toggleDay = (idx: number) => {
    setWeekly(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        enabled: !prev[idx].enabled,
        slots: !prev[idx].enabled ? [...TIME_SLOTS] : [],
      },
    }))
    setDefaultsDirty(true)
  }

  const toggleSlot = (dayIdx: number, slot: string) => {
    setWeekly(prev => {
      const day = prev[dayIdx]
      const newSlots = day.slots.includes(slot)
        ? day.slots.filter(s => s !== slot)
        : [...day.slots, slot].sort()
      return { ...prev, [dayIdx]: { ...day, slots: newSlots } }
    })
    setDefaultsDirty(true)
  }

  const saveDefaults = async () => {
    setSavingDefaults(true)
    try {
      const entries = Object.entries(weekly).map(([idxStr, val]) => ({
        dayOfWeek: INDEX_TO_JS_DAY[Number(idxStr)],
        timeSlots: val.slots,
        isBlocked: !val.enabled,
      }))

      const res = await fetch('/api/dashboard/provider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true, entries }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Weekly defaults saved!')
      setDefaultsDirty(false)
    } catch {
      toast.error('Could not save defaults')
    } finally {
      setSavingDefaults(false)
    }
  }

  // ─── Calendar handlers ────────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const openDateModal = (dateKey: string) => {
    const override = overrides.get(dateKey)
    if (override) {
      setModalSlots([...override.timeSlots])
      setModalBlocked(override.isBlocked)
    } else {
      // Pre-populate from weekly default
      const [y, m, d] = dateKey.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const jsDay = date.getDay()
      const idx = jsDay === 0 ? 6 : jsDay - 1
      const dayDefault = weekly[idx]
      setModalSlots(dayDefault.enabled ? [...dayDefault.slots] : [])
      setModalBlocked(!dayDefault.enabled)
    }
    setSelectedDate(dateKey)
  }

  const saveDate = async () => {
    if (!selectedDate) return
    setSavingDate(true)
    try {
      const res = await fetch('/api/dashboard/provider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          timeSlots: modalBlocked ? [] : modalSlots,
          isBlocked: modalBlocked,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const saved = await res.json()

      setOverrides(prev => {
        const next = new Map(prev)
        next.set(saved.date, saved)
        return next
      })

      toast.success(`${formatDateLong(selectedDate)} updated!`)
      setSelectedDate(null)
    } catch {
      toast.error('Could not save date')
    } finally {
      setSavingDate(false)
    }
  }

  const resetDate = async () => {
    if (!selectedDate) return
    setSavingDate(true)
    try {
      await fetch(`/api/dashboard/provider/availability/${selectedDate}`, { method: 'DELETE' })
      setOverrides(prev => {
        const next = new Map(prev)
        next.delete(selectedDate)
        return next
      })
      toast.success('Reset to weekly default')
      setSelectedDate(null)
    } catch {
      toast.error('Could not reset date')
    } finally {
      setSavingDate(false)
    }
  }

  // ─── Quick actions ────────────────────────────────────────────────────────

  const blockNextDays = async (days: number) => {
    const startDate = toDateKey(new Date())
    try {
      const res = await fetch('/api/dashboard/provider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockRange: true, startDate, days }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Blocked next ${days} days`)
      await fetchData()
    } catch {
      toast.error('Could not block dates')
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const todayKey = toDateKey(new Date())

  const getDateStatus = (dateKey: string, jsDay: number): 'blocked' | 'custom' | 'default-blocked' | 'normal' => {
    const override = overrides.get(dateKey)
    if (override) {
      if (override.isBlocked) return 'blocked'
      return 'custom'
    }
    // Check weekly default
    const idx = jsDay === 0 ? 6 : jsDay - 1
    if (!weekly[idx]?.enabled) return 'default-blocked'
    return 'normal'
  }

  const getBookingCount = (dateKey: string): number =>
    bookedSlots.filter(b => b.date === dateKey).length

  // ─── Loading state ────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  const calendarDays = getCalendarDays(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/provider"
            className="mb-4 inline-flex items-center gap-1 text-body-compact text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1A1A1A]">Manage Availability</h1>
              <p className="mt-1 text-body-compact text-[#717171]">
                Set your weekly schedule and customise specific dates
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => blockNextDays(7)}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Palmtree className="h-4 w-4" /> Block next 7 days
          </button>
          <button
            onClick={() => blockNextDays(14)}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Ban className="h-4 w-4" /> Block next 14 days
          </button>
          <button
            onClick={async () => {
              if (window.confirm('Remove all date overrides and use weekly defaults only?')) {
                // Reset all overrides by re-fetching after clearing
                for (const dateKey of Array.from(overrides.keys())) {
                  await fetch(`/api/dashboard/provider/availability/${dateKey}`, { method: 'DELETE' })
                }
                toast.success('All overrides cleared')
                await fetchData()
              }
            }}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] shadow-sm transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
          >
            <RotateCcw className="h-4 w-4" /> Reset all overrides
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ─── Left: Weekly Defaults ─────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#E96B56]" />
                <h2 className="text-lg font-bold text-[#1A1A1A]">Weekly Defaults</h2>
              </div>
              {defaultsDirty && (
                <Button variant="primary" size="sm" onClick={saveDefaults} loading={savingDefaults}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {DAY_NAMES.map((name, idx) => {
                  const day = weekly[idx]
                  return (
                    <div key={idx} className="rounded-xl border border-[#e8e1de] bg-[#f9f2ef]/50 p-3">
                      {/* Day header + toggle */}
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${day.enabled ? 'text-[#1A1A1A]' : 'text-[#717171]'}`}>
                          {name}
                        </span>
                        <button
                          onClick={() => toggleDay(idx)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            day.enabled ? 'bg-[#E96B56]' : 'bg-gray-300'
                          }`}
                          aria-label={`Toggle ${name}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              day.enabled ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Time slots */}
                      {day.enabled && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {TIME_SLOTS.map(slot => {
                            const active = day.slots.includes(slot)
                            return (
                              <button
                                key={slot}
                                onClick={() => toggleSlot(idx, slot)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                  active
                                    ? 'bg-[#E96B56] text-white shadow-sm'
                                    : 'bg-white border border-[#e8e1de] text-[#717171] hover:border-[#E96B56] hover:text-[#E96B56]'
                                }`}
                              >
                                {formatTime(slot)}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ─── Right: Calendar Overrides ─────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_4px_rgba(26,31,54,0.07)]">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#E96B56]" />
              <h2 className="text-lg font-bold text-[#1A1A1A]">Calendar</h2>
            </div>

            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-lg p-2 text-[#717171] hover:bg-[#f3ece9]">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-bold text-[#1A1A1A]">{monthLabel}</span>
              <button onClick={nextMonth} className="rounded-lg p-2 text-[#717171] hover:bg-[#f3ece9]">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_SHORT.map(d => (
                <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#717171]">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, inMonth }, i) => {
                  const dateKey = toDateKey(date)
                  const isPast = dateKey < todayKey
                  const isToday = dateKey === todayKey
                  const status = getDateStatus(dateKey, date.getDay())
                  const bookingCount = getBookingCount(dateKey)
                  const clickable = inMonth && !isPast

                  return (
                    <button
                      key={i}
                      disabled={!clickable}
                      onClick={() => clickable && openDateModal(dateKey)}
                      className={`relative flex h-12 flex-col items-center justify-center rounded-lg text-sm transition-all
                        ${!inMonth ? 'text-[#e8e1de]' : ''}
                        ${inMonth && isPast ? 'text-[#717171]' : ''}
                        ${isToday ? 'ring-2 ring-[#E96B56] ring-offset-1' : ''}
                        ${clickable && status === 'blocked' ? 'bg-red-50 text-red-400 line-through' : ''}
                        ${clickable && status === 'default-blocked' ? 'bg-[#f9f2ef] text-[#717171]' : ''}
                        ${clickable && status === 'custom' ? 'bg-amber-50 text-[#1A1A1A] font-semibold' : ''}
                        ${clickable && status === 'normal' ? 'text-[#1A1A1A] hover:bg-[#f9f2ef]' : ''}
                      `}
                    >
                      <span>{date.getDate()}</span>
                      {/* Indicators */}
                      <div className="flex gap-0.5">
                        {clickable && status === 'custom' && (
                          <span className="h-1 w-1 rounded-full bg-[#E96B56]" />
                        )}
                        {clickable && bookingCount > 0 && (
                          <span className="h-1 w-1 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-[#e8e1de] pt-3">
              <div className="flex items-center gap-1.5 text-[10px] text-[#717171]">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-50 ring-1 ring-red-200" /> Blocked
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#717171]">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-50 ring-1 ring-amber-200" /> Custom hours
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#717171]">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#f9f2ef] ring-1 ring-gray-200" /> Day off (default)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#717171]">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Has bookings
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Date Edit Modal ─────────────────────────────────────────── */}
      <Modal
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDateLong(selectedDate) : ''}
        size="md"
      >
        <div className="space-y-5">
          {/* Block toggle */}
          <div className="flex items-center justify-between rounded-xl bg-red-50/50 p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-[#1A1A1A]">Block this day</span>
            </div>
            <button
              onClick={() => setModalBlocked(!modalBlocked)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                modalBlocked ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  modalBlocked ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Booked slots warning */}
          {selectedDate && getBookingCount(selectedDate) > 0 && (
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
              <strong>{getBookingCount(selectedDate)} booking(s)</strong> on this date. Already-booked slots cannot be removed.
            </div>
          )}

          {/* Time slots grid */}
          {!modalBlocked && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">Available time slots</label>
              <div className="grid grid-cols-5 gap-2">
                {TIME_SLOTS.map(slot => {
                  const active = modalSlots.includes(slot)
                  const isBooked = selectedDate
                    ? bookedSlots.some(b => b.date === selectedDate && b.time === slot)
                    : false

                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => {
                        setModalSlots(prev =>
                          prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort()
                        )
                      }}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        isBooked
                          ? 'bg-blue-100 text-blue-600 cursor-not-allowed ring-1 ring-blue-200'
                          : active
                          ? 'bg-[#E96B56] text-white shadow-sm'
                          : 'bg-[#f9f2ef] text-[#717171] hover:bg-[#f3ece9]'
                      }`}
                      title={isBooked ? 'Already booked' : ''}
                    >
                      {formatTime(slot)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-[#e8e1de] pt-4">
            {overrides.has(selectedDate || '') ? (
              <button
                onClick={resetDate}
                className="flex items-center gap-1 text-sm text-[#717171] hover:text-[#E96B56]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset to default
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDate(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={saveDate} loading={savingDate}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
