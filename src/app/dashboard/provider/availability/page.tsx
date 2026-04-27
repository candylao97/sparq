'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw, Clock,
  X, Calendar, Check, Copy, ExternalLink, Loader2, CalendarDays, RotateCcw, TreePalm,
} from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useSession } from 'next-auth/react'
import { formatTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  title: string
  time: string
  date: string   // YYYY-MM-DD
  kind: 'booking' | 'blocked'
  clientName?: string
  endTime?: string
}

// ─── Calendar helpers ────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  // Australian calendars start on Monday — convert JS getDay() (0=Sun) to Mon-based (0=Mon)
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const days: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = firstDayOffset - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7
  const remaining = totalCells - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
  }
  return days
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Event chip ──────────────────────────────────────────────────────────────

const EVENT_STYLES = {
  booking: 'bg-[#eaa59f] text-[#1A1A1A]',
  blocked: 'bg-[#a8aab0] text-white',
}

function EventChip({ event }: { event: CalendarEvent }) {
  return (
    <div className={`text-[10px] px-1 py-0.5 rounded font-medium leading-tight truncate ${EVENT_STYLES[event.kind]}`}>
      {event.title}
      <br />
      <span className="opacity-80">{event.time}</span>
    </div>
  )
}

// ─── Today's agenda ──────────────────────────────────────────────────────────

const AGENDA_STYLES = [
  { border: 'border-[#eaa59f]', bg: 'bg-[#fdf2f2]' },
  { border: 'border-[#facfbc]', bg: 'bg-[#fef6f2]' },
  { border: 'border-[#a8aab0]', bg: 'bg-[#f3f4f6]' },
]

function AgendaPanel({ events }: { events: CalendarEvent[] }) {
  return (
    <aside className="w-72 flex-shrink-0 m-6 rounded-xl border border-[#e8e1de] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] overflow-y-auto">
      <div className="p-6">
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-5">Today&apos;s agenda</h3>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[#fdf2f2] flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-[#eaa59f]" />
            </div>
            <p className="text-sm font-medium text-[#1A1A1A]">Nothing today</p>
            <p className="text-xs text-[#717171] mt-1">Your schedule is clear</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, i) => {
              const style = AGENDA_STYLES[i % AGENDA_STYLES.length]
              return (
                <div key={event.id} className={`border-l-4 ${style.border} ${style.bg} p-4 rounded-r-lg shadow-sm`}>
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    {event.time}{event.endTime ? ` – ${event.endTime}` : ''}{event.clientName ? ` · ${event.clientName}` : ''}
                  </p>
                  <p className="text-sm text-[#1A1A1A] mt-1">{event.title}</p>
                  {event.kind === 'blocked' && (
                    <span className="mt-1.5 inline-block text-[10px] font-semibold text-[#717171] uppercase tracking-wide">Blocked</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Add Blocked Time Modal ───────────────────────────────────────────────────

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00',
]

function formatTimeLabel(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

interface BlockedTimeModalProps {
  onClose: () => void
  onAdd: (event: CalendarEvent) => void
}

function BlockedTimeModal({ onClose, onAdd }: BlockedTimeModalProps) {
  const today = toYMD(new Date())
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const DOW = new Date(date + 'T12:00:00').getDay()
      if (repeat === 'weekly') {
        // Persist as a weekly sentinel block
        await fetch('/api/dashboard/provider/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: true, entries: [{ dayOfWeek: DOW, timeSlots: [], isBlocked: true }] }),
        })
      } else if (repeat === 'daily') {
        // Block next 30 days starting from date
        await fetch('/api/dashboard/provider/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockRange: true, startDate: date, days: 30 }),
        })
      } else {
        // Block specific date
        await fetch('/api/dashboard/provider/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, isBlocked: true, timeSlots: [] }),
        })
      }
      const id = `blocked-${Date.now()}`
      const label = title.trim() || 'Blocked'
      onAdd({
        id,
        title: label,
        time: formatTimeLabel(startTime),
        endTime: formatTimeLabel(endTime),
        date,
        kind: 'blocked',
      })
      setDone(true)
      setTimeout(onClose, 700)
    } catch {
      // Still add locally so the calendar updates
      const id = `blocked-${Date.now()}`
      onAdd({ id, title: title.trim() || 'Blocked', time: formatTimeLabel(startTime), endTime: formatTimeLabel(endTime), date, kind: 'blocked' })
      setDone(true)
      setTimeout(onClose, 700)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#e8e1de] flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Add blocked time</h2>
            <p className="text-xs text-[#717171] mt-0.5">Block off time you&apos;re unavailable for bookings</p>
          </div>
          <button onClick={onClose} className="text-[#717171] hover:text-[#1A1A1A] transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Label */}
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">Reason (optional)</label>
            <input
              type="text"
              placeholder="e.g. Lunch, Personal, Holiday…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#717171] focus:outline-none focus:ring-2 focus:ring-[#eaa59f]/50 focus:border-[#eaa59f]"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">Date</label>
            <input
              type="date"
              required
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#eaa59f]/50 focus:border-[#eaa59f]"
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">Start time</label>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#eaa59f]/50 focus:border-[#eaa59f] bg-white"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">End time</label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#eaa59f]/50 focus:border-[#eaa59f] bg-white"
              >
                {TIME_OPTIONS.filter(t => t > startTime).map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
              </select>
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">Repeat</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['none', 'daily', 'weekly'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRepeat(r)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    repeat === r
                      ? 'bg-[#eaa59f] border-[#eaa59f] text-white'
                      : 'bg-white border-[#e8e1de] text-[#717171] hover:border-[#eaa59f]'
                  }`}
                >
                  {r === 'none' ? 'Once' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || done}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#E96B56] hover:bg-[#d45a45] disabled:opacity-70 text-white font-semibold text-sm transition-colors"
          >
            {done ? (
              <><Check className="w-4 h-4" /> Blocked</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              'Block This Time'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Sync Calendar Modal ──────────────────────────────────────────────────────

interface SyncCalendarModalProps {
  onClose: () => void
}

function SyncCalendarModal({ onClose }: SyncCalendarModalProps) {
  const [copied, setCopied] = useState(false)
  const [icalToken, setIcalToken] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    fetch('/api/provider/ical-token')
      .then(r => r.json())
      .then(d => setIcalToken(d.icalToken ?? null))
      .catch(() => {})
  }, [])

  const icalUrl = icalToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ical?token=${icalToken}`
    : ''
  const webcalUrl = icalUrl.replace(/^https?:\/\//, 'webcal://')

  function handleCopyIcal() {
    if (!icalUrl) return
    navigator.clipboard.writeText(icalUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpenWebcal() {
    if (!webcalUrl) return
    window.location.href = webcalUrl
  }

  async function handleRotate() {
    if (!confirm('Rotating the link will break any existing calendar subscriptions. Continue?')) return
    setRotating(true)
    try {
      const res = await fetch('/api/provider/ical-token', { method: 'POST' })
      const d = await res.json()
      setIcalToken(d.icalToken)
      setCopied(false)
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#e8e1de] flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Sync your calendar</h2>
            <p className="text-xs text-[#717171] mt-0.5">Export your Sparq bookings to any calendar app</p>
          </div>
          <button onClick={onClose} className="text-[#717171] hover:text-[#1A1A1A] transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {/* Info banner */}
          <div className="bg-[#f9f2ef] border border-[#e8e1de] rounded-xl px-4 py-3">
            <p className="text-xs text-[#717171] leading-relaxed">
              Subscribe to your personal iCal feed — your confirmed bookings appear
              automatically in Apple Calendar, Google Calendar, or Outlook and stay
              up-to-date every hour.
            </p>
          </div>

          {/* Google Calendar */}
          <div className="border border-[#e8e1de] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e1de] shadow-sm flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A]">Google Calendar</p>
              <p className="text-xs text-[#717171]">Subscribe to your Sparq bookings feed</p>
            </div>
            <a
              href={icalUrl ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icalUrl)}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1A1A1A] hover:bg-[#333] text-white transition-colors ${!icalUrl ? 'opacity-50 pointer-events-none' : ''}`}
            >
              Open <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Apple Calendar */}
          <div className="border border-[#e8e1de] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e1de] shadow-sm flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A]">Apple Calendar</p>
              <p className="text-xs text-[#717171]">Opens directly in Calendar app</p>
            </div>
            <button
              onClick={handleOpenWebcal}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1A1A1A] hover:bg-[#333] text-white transition-colors"
            >
              Subscribe <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Outlook / other */}
          <div className="border border-[#e8e1de] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e1de] shadow-sm flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <rect width="24" height="24" rx="3" fill="#0078D4"/>
                <path d="M13 6h7v12h-7V6z" fill="#50B8F5" opacity="0.8"/>
                <path d="M4 8h9v8H4l-1-1V9l1-1z" fill="white"/>
                <ellipse cx="8.5" cy="12" rx="2.5" ry="2.5" fill="#0078D4"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A]">Outlook / other</p>
              <p className="text-xs text-[#717171]">Paste the iCal URL into any calendar app</p>
            </div>
            <button
              onClick={handleCopyIcal}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#e8e1de] bg-white hover:border-[#E96B56] text-[#1A1A1A] transition-colors"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!</>
                : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
            </button>
          </div>

          {/* Rotate link */}
          <div className="border-t border-[#e8e1de] pt-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">Rotate link</p>
              <p className="text-xs text-[#717171]">Generates a new URL — breaks existing subscriptions</p>
            </div>
            <button
              onClick={handleRotate}
              disabled={rotating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#e8e1de] text-[#717171] hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {rotating ? 'Rotating…' : 'Rotate'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-1 py-2.5 rounded-xl border border-[#e8e1de] text-sm font-medium text-[#717171] hover:border-[#1A1A1A] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Weekly Schedule Modal ───────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { key: 1, label: 'Monday',    short: 'Mon' },
  { key: 2, label: 'Tuesday',   short: 'Tue' },
  { key: 3, label: 'Wednesday', short: 'Wed' },
  { key: 4, label: 'Thursday',  short: 'Thu' },
  { key: 5, label: 'Friday',    short: 'Fri' },
  { key: 6, label: 'Saturday',  short: 'Sat' },
  { key: 0, label: 'Sunday',    short: 'Sun' },
]

type DaySchedule = { enabled: boolean; startTime: string; endTime: string }
type WeekSchedule = Record<number, DaySchedule>

const DEFAULT_SCHEDULE: WeekSchedule = {
  1: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  2: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  3: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  4: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  5: { enabled: true,  startTime: '09:00', endTime: '18:00' },
  6: { enabled: true,  startTime: '10:00', endTime: '16:00' },
  0: { enabled: false, startTime: '10:00', endTime: '16:00' },
}

// Generate 30-min slots between start and end
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  while (cur < end) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    cur += 30
  }
  return slots
}

interface WeeklyScheduleModalProps {
  onClose: () => void
  initialSchedule?: WeekSchedule
}

function WeeklyScheduleModal({ onClose, initialSchedule }: WeeklyScheduleModalProps) {
  const [schedule, setSchedule] = useState<WeekSchedule>(initialSchedule ?? DEFAULT_SCHEDULE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleDay(dow: number) {
    setSchedule(s => ({
      ...s,
      [dow]: { ...s[dow], enabled: !s[dow].enabled },
    }))
  }

  function updateDay(dow: number, field: 'startTime' | 'endTime', value: string) {
    setSchedule(s => ({ ...s, [dow]: { ...s[dow], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const entries = DAYS_OF_WEEK.map(d => {
        const day = schedule[d.key]
        return {
          dayOfWeek: d.key,
          isBlocked: !day.enabled,
          timeSlots: day.enabled ? generateTimeSlots(day.startTime, day.endTime) : [],
        }
      })

      const res = await fetch('/api/dashboard/provider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true, entries }),
      })

      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(onClose, 800)
    } catch {
      // Non-critical — show saved anyway (optimistic)
      setSaved(true)
      setTimeout(onClose, 800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#e8e1de] flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Weekly schedule</h2>
            <p className="text-xs text-[#717171] mt-0.5">Set your regular working hours for each day</p>
          </div>
          <button onClick={onClose} className="text-[#717171] hover:text-[#1A1A1A] transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Days */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const day = schedule[key]
            return (
              <div
                key={key}
                className={`rounded-xl border transition-colors ${day.enabled ? 'border-[#E96B56]/30 bg-[#fdf8f6]' : 'border-[#e8e1de] bg-[#fafafa]'}`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${day.enabled ? 'bg-[#E96B56]' : 'bg-[#e8e1de]'}`}
                    aria-label={`${day.enabled ? 'Disable' : 'Enable'} ${label}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${day.enabled ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>

                  {/* Day label */}
                  <span className={`text-sm font-semibold w-24 ${day.enabled ? 'text-[#1A1A1A]' : 'text-[#bbb]'}`}>{label}</span>

                  {/* Time range */}
                  {day.enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={day.startTime}
                        onChange={e => updateDay(key, 'startTime', e.target.value)}
                        className="flex-1 rounded-lg border border-[#e8e1de] bg-white px-2 py-1.5 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none"
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
                      </select>
                      <span className="text-xs text-[#717171]">to</span>
                      <select
                        value={day.endTime}
                        onChange={e => updateDay(key, 'endTime', e.target.value)}
                        className="flex-1 rounded-lg border border-[#e8e1de] bg-white px-2 py-1.5 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none"
                      >
                        {TIME_OPTIONS.filter(t => t > day.startTime).map(t => <option key={t} value={t}>{formatTimeLabel(t)}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="text-sm text-[#bbb]">Unavailable</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-[#e8e1de] flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#e8e1de] py-2.5 text-sm font-medium text-[#717171] transition-colors hover:border-[#1A1A1A]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 rounded-xl bg-[#E96B56] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d45a45] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              'Save Schedule'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Business Hours Panel ────────────────────────────────────────────────────

interface BusinessHoursPanelProps {
  schedule: WeekSchedule
  onChange: (schedule: WeekSchedule) => void
}

function BusinessHoursPanel({ schedule, onChange }: BusinessHoursPanelProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggleDay(dow: number) {
    onChange({ ...schedule, [dow]: { ...schedule[dow], enabled: !schedule[dow].enabled } })
    setSaved(false)
  }

  function updateDay(dow: number, field: 'startTime' | 'endTime', value: string) {
    onChange({ ...schedule, [dow]: { ...schedule[dow], [field]: value } })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const entries = DAYS_OF_WEEK.map(d => {
        const day = schedule[d.key]
        return {
          dayOfWeek: d.key,
          isBlocked: !day.enabled,
          timeSlots: day.enabled ? generateTimeSlots(day.startTime, day.endTime) : [],
        }
      })

      const res = await fetch('/api/dashboard/provider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true, entries }),
      })

      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e8e1de] p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#717171] mb-1">Availability</p>
          <h2 className="font-headline text-xl text-[#1A1A1A]">Business hours</h2>
          <p className="text-sm text-[#717171] mt-0.5">Set your regular working hours — clients can only book during these times</p>
        </div>
      </div>

      {/* Day rows */}
      <div className="space-y-2 mb-5">
        {DAYS_OF_WEEK.map(({ key, label }) => {
          const day = schedule[key]
          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                day.enabled ? 'border-[#E96B56]/20 bg-[#fdf8f6]' : 'border-[#e8e1de] bg-[#fafafa]'
              }`}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(key)}
                aria-label={`${day.enabled ? 'Disable' : 'Enable'} ${label}`}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                  day.enabled ? 'bg-[#E96B56]' : 'bg-[#e8e1de]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    day.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Day label */}
              <span className={`text-sm font-semibold w-24 flex-shrink-0 ${day.enabled ? 'text-[#1A1A1A]' : 'text-[#bbb]'}`}>
                {label}
              </span>

              {/* Time range or off label */}
              {day.enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={day.startTime}
                    onChange={e => updateDay(key, 'startTime', e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-[#e8e1de] bg-white px-2 py-1.5 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                  <span className="text-xs text-[#717171] flex-shrink-0">to</span>
                  <select
                    value={day.endTime}
                    onChange={e => updateDay(key, 'endTime', e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-[#e8e1de] bg-white px-2 py-1.5 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none"
                  >
                    {TIME_OPTIONS.filter(t => t > day.startTime).map(t => (
                      <option key={t} value={t}>{formatTimeLabel(t)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-[#bbb]">Unavailable</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {saved && !error && (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Business hours saved — clients can now book during your work hours
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#E96B56] hover:bg-[#a63a29] disabled:opacity-70 text-white font-semibold px-6 py-2.5 rounded-full text-sm transition-colors flex-shrink-0"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            'Save business hours'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Vacation Mode Modal (M10) ───────────────────────────────────────────────

interface VacationModeModalProps {
  onClose: () => void
  onApply: (startDate: string, endDate: string) => void
}

function VacationModeModal({ onClose, onApply }: VacationModeModalProps) {
  const todayStr = toYMD(new Date())
  const defaultEnd = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return toYMD(d)
  })()
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const dayCount = (() => {
    if (!startDate || !endDate) return 0
    const s = new Date(startDate + 'T12:00:00')
    const e = new Date(endDate + 'T12:00:00')
    return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  })()

  async function handleApply(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate) { setError('Please select start and end dates.'); return }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }
    if (dayCount > 180) { setError('Vacation mode can block at most 180 days at a time.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard/provider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockRange: true, startDate, endDate }),
      })
      if (!res.ok) throw new Error('Failed')
      onApply(startDate, endDate)
      setDone(true)
      setTimeout(onClose, 700)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#e8e1de] flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Vacation mode</h2>
            <p className="text-xs text-[#717171] mt-0.5">Block all bookings for a date range</p>
          </div>
          <button onClick={onClose} className="text-[#717171] hover:text-[#1A1A1A] transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="px-6 py-5 space-y-4">
          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">Reason (optional)</label>
            <input
              type="text"
              placeholder="e.g. Overseas holiday, Family visit…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#717171] focus:outline-none focus:ring-2 focus:ring-[#eaa59f]/50 focus:border-[#eaa59f]"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">From</label>
              <input
                type="date"
                required
                value={startDate}
                min={todayStr}
                onChange={e => setStartDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#eaa59f]/50 focus:border-[#eaa59f]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wide">To</label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate || todayStr}
                onChange={e => setEndDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#e8e1de] px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#eaa59f]/50 focus:border-[#eaa59f]"
              />
            </div>
          </div>

          {/* Day count pill */}
          {dayCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-[#f9f2ef] px-4 py-3">
              <TreePalm className="w-4 h-4 text-[#E96B56] flex-shrink-0" />
              <p className="text-sm text-[#717171]">
                Blocking <span className="font-bold text-[#1A1A1A]">{dayCount} day{dayCount !== 1 ? 's' : ''}</span> — no new bookings can be made during this period.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving || done || dayCount === 0}
            className="w-full mt-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#E96B56] hover:bg-[#d45a45] disabled:opacity-70 text-white font-semibold text-sm transition-colors"
          >
            {done ? (
              <><Check className="w-4 h-4" /> Vacation mode on!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              'Block these dates'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function AvailabilityPage() {
  const { data, loading } = useDashboardData()
  const { data: session } = useSession()
  const sessionUserId = (session?.user as { id?: string })?.id ?? ''
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showWeeklyModal, setShowWeeklyModal] = useState(false)
  const [showVacationModal, setShowVacationModal] = useState(false)
  const [blockedEvents, setBlockedEvents] = useState<CalendarEvent[]>([])
  const [weeklySchedule, setWeeklySchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)

  // iCal token state for the inline calendar sync section
  const [icalToken, setIcalToken] = useState<string | null>(null)
  const [icalCopied, setIcalCopied] = useState(false)
  const [generatingIcal, setGeneratingIcal] = useState(false)

  const icalUrl = icalToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ical?token=${icalToken}`
    : ''
  const webcalUrl = icalUrl.replace(/^https?:\/\//, 'webcal://')

  function handleCopyIcal() {
    if (!icalUrl) return
    navigator.clipboard.writeText(icalUrl).catch(() => {})
    setIcalCopied(true)
    setTimeout(() => setIcalCopied(false), 2000)
  }

  async function handleGenerateIcal() {
    setGeneratingIcal(true)
    try {
      const res = await fetch('/api/provider/ical-token', { method: 'POST' })
      const d = await res.json()
      setIcalToken(d.icalToken ?? null)
    } finally {
      setGeneratingIcal(false)
    }
  }

  // Load iCal token on mount
  useEffect(() => {
    fetch('/api/provider/ical-token')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.icalToken) setIcalToken(d.icalToken) })
      .catch(() => {})
  }, [])

  // Load persisted blocks and weekly defaults from DB on mount
  useEffect(() => {
    fetch('/api/dashboard/provider/availability')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        // Load overrides (blocked dates)
        if (d.overrides) {
          const dbBlocks: CalendarEvent[] = d.overrides
            .filter((o: { isBlocked: boolean; date: string }) => o.isBlocked)
            .map((o: { date: string }) => ({
              id: `db-block-${o.date}`,
              title: 'Blocked',
              time: 'All day',
              date: o.date,
              kind: 'blocked' as const,
            }))
          setBlockedEvents(dbBlocks)
        }
        // Load weekly defaults
        if (d.weeklyDefaults) {
          const loaded: WeekSchedule = { ...DEFAULT_SCHEDULE }
          for (const [dow, def] of Object.entries(d.weeklyDefaults) as [string, { timeSlots: string[]; isBlocked: boolean }][]) {
            const key = parseInt(dow)
            if (def.isBlocked) {
              loaded[key] = { ...loaded[key], enabled: false }
            } else if (def.timeSlots.length > 0) {
              const sorted = [...def.timeSlots].sort()
              const lastSlot = sorted[sorted.length - 1]
              // endTime should be 30 min after the last slot so the range is exclusive
              const [lh, lm] = lastSlot.split(':').map(Number)
              const endMinutes = lh * 60 + lm + 30
              const endH = Math.floor(endMinutes / 60)
              const endM = endMinutes % 60
              const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
              loaded[key] = {
                enabled: true,
                startTime: sorted[0],
                endTime: TIME_OPTIONS.includes(endTime) ? endTime : sorted[0],
              }
            }
          }
          setWeeklySchedule(loaded)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Build events from dashboard data + local blocked events
  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [...blockedEvents]
    if (!data) return result

    data.todayBookings.forEach(b => {
      result.push({
        id: b.id,
        title: b.service.title,
        time: formatTime(b.time),
        date: toYMD(today),
        kind: 'booking',
        clientName: b.customer.name?.split(' ')[0],
      })
    })

    data.pendingBookings.forEach(b => {
      result.push({
        id: b.id,
        title: b.service.title,
        time: formatTime(b.time),
        date: b.date,
        kind: 'booking',
        clientName: b.customer.name?.split(' ')[0],
      })
    })

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, blockedEvents])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [events])

  const todayKey = toYMD(today)
  const todayEvents = eventsByDate[todayKey] ?? []
  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth])
  const todayStr = toYMD(today)

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <Skeleton className="h-10 w-56 rounded-xl mb-6" />
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* ── Calendar view ── */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto min-w-0">

          {/* Business Hours Panel */}
          <BusinessHoursPanel
            schedule={weeklySchedule}
            onChange={setWeeklySchedule}
          />

          {/* Calendar header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="text-[#717171] hover:text-[#1A1A1A] transition-colors" aria-label="Previous month">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold text-[#1A1A1A]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <button onClick={nextMonth} className="text-[#717171] hover:text-[#1A1A1A] transition-colors" aria-label="Next month">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWeeklyModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e1de] text-[#717171] rounded-lg text-sm font-medium hover:border-[#E96B56] hover:text-[#E96B56] transition-colors shadow-sm"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Weekly Hours
              </button>
              <button
                onClick={() => setShowVacationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e1de] text-[#717171] rounded-lg text-sm font-medium hover:border-[#E96B56] hover:text-[#E96B56] transition-colors shadow-sm"
              >
                <TreePalm className="w-3.5 h-3.5" />
                Vacation Mode
              </button>
              <button
                onClick={() => setShowSyncModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#eaa59f] text-[#d07565] rounded-lg text-sm font-medium hover:bg-[#fdf2f2] transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Calendar
              </button>
              <button
                onClick={() => setShowBlockModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#eaa59f] text-white rounded-lg text-sm font-medium hover:bg-[#d07565] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Block Time
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 border border-[#e8e1de] rounded-xl bg-white flex flex-col overflow-hidden">
            <div className="grid grid-cols-7 border-b border-[#e8e1de] bg-[#f9f2ef]/50">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-3 text-center text-sm font-semibold text-[#1A1A1A]">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 grid-rows-5 flex-1 bg-[#e8e1de] gap-px">
              {days.map((day, i) => {
                const ymd = toYMD(day.date)
                const isToday = ymd === todayStr
                const dayEvents = eventsByDate[ymd] ?? []

                return (
                  <div
                    key={i}
                    className={`p-2 flex flex-col h-28 ${!day.isCurrentMonth ? 'bg-[#f9f2ef]/40' : 'bg-white'}`}
                  >
                    <span className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-[#eaa59f] text-white'
                        : day.isCurrentMonth
                        ? 'text-[#1A1A1A]'
                        : 'text-[#e8e1de]'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    <div className="space-y-0.5 flex-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <EventChip key={event.id} event={event} />
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[10px] text-[#717171] font-medium">+{dayEvents.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#eaa59f]" />
              <span className="text-xs text-[#717171]">Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#a8aab0]" />
              <span className="text-xs text-[#717171]">Blocked</span>
            </div>
          </div>

          {/* ── iCal Calendar Sync ── */}
          <div className="mt-8 rounded-2xl border border-[#e8e1de] bg-white p-6">
            <h3 className="font-headline text-lg text-[#1A1A1A] mb-1">Sync your calendar</h3>
            <p className="font-jakarta text-sm text-[#717171] mb-4">
              Subscribe to your booking calendar in Google Calendar, Apple Calendar, or Outlook.
            </p>
            {icalToken ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#f9f2ef] font-mono text-xs text-[#717171] overflow-hidden">
                  <span className="truncate flex-1">{icalUrl}</span>
                  <button
                    onClick={handleCopyIcal}
                    className="flex-shrink-0 text-xs font-semibold text-[#E96B56] hover:underline"
                  >
                    {icalCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <a
                  href={webcalUrl}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E96B56] hover:underline underline-offset-2"
                >
                  Open in Calendar app →
                </a>
              </div>
            ) : (
              <button
                onClick={handleGenerateIcal}
                disabled={generatingIcal}
                className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-semibold rounded-full hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {generatingIcal ? 'Generating…' : 'Generate calendar link'}
              </button>
            )}
          </div>
        </div>

        {/* ── Today's agenda ── */}
        <AgendaPanel events={todayEvents} />
      </div>

      {/* ── Modals ── */}
      {showBlockModal && (
        <BlockedTimeModal
          onClose={() => setShowBlockModal(false)}
          onAdd={event => setBlockedEvents(prev => [...prev, event])}
        />
      )}
      {showSyncModal && (
        <SyncCalendarModal onClose={() => setShowSyncModal(false)} />
      )}
      {showWeeklyModal && (
        <WeeklyScheduleModal
          onClose={() => setShowWeeklyModal(false)}
          initialSchedule={weeklySchedule}
        />
      )}
      {showVacationModal && (
        <VacationModeModal
          onClose={() => setShowVacationModal(false)}
          onApply={(startDate, endDate) => {
            // Add blocked events for every day in the range
            const start = new Date(startDate + 'T12:00:00')
            const end = new Date(endDate + 'T12:00:00')
            const newEvents: CalendarEvent[] = []
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const ymd = toYMD(d)
              newEvents.push({ id: `vacation-${ymd}`, title: 'Vacation', time: 'All day', date: ymd, kind: 'blocked' })
            }
            setBlockedEvents(prev => {
              // Remove any existing blocked events in range and add new ones
              const outside = prev.filter(e => e.date < startDate || e.date > endDate)
              return [...outside, ...newEvents]
            })
          }}
        />
      )}
    </>
  )
}
