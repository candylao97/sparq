'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Play, Clock } from 'lucide-react'

// ── Cron job definitions ───────────────────────────────────────────

const CRON_JOBS = [
  {
    name: 'expire-bookings',
    label: 'Expire Bookings',
    description: 'Expire PENDING bookings past their accept deadline; auto-complete old CONFIRMED bookings',
  },
  {
    name: 'expire-featured',
    label: 'Expire Featured',
    description: 'Remove expired featured listings',
  },
  {
    name: 'expire-payments',
    label: 'Expire Payments',
    description: 'Cancel stale payment holds',
  },
  {
    name: 'process-payouts',
    label: 'Process Payouts',
    description: 'Trigger scheduled payouts to artists',
  },
  {
    name: 're-engage-providers',
    label: 'Re-engage Providers',
    description: 'Nudge inactive artists to update availability',
  },
  {
    name: 'review-reminders',
    label: 'Review Reminders',
    description: 'Remind clients to leave reviews',
  },
  {
    name: 'send-reminders',
    label: 'Send Reminders',
    description: 'Send upcoming appointment reminders',
  },
  {
    name: 'update-tiers',
    label: 'Update Tiers',
    description: 'Recalculate artist tier badges (Sparq Score)',
  },
  {
    name: 'cleanup-notifications',
    label: 'Cleanup Notifications',
    description: 'Remove old read notifications',
  },
  {
    name: 'cleanup-webhook-events',
    label: 'Cleanup Webhook Events',
    description: 'Prune processed Stripe webhook log',
  },
  {
    name: 'notify-waitlist',
    label: 'Notify Waitlist',
    description: 'Email waitlisted users of new artist matches',
  },
] as const

type CronName = (typeof CRON_JOBS)[number]['name']

// ── Types ──────────────────────────────────────────────────────────

interface CronResult {
  ok: boolean
  status: number
  result: unknown
}

// ── Page ──────────────────────────────────────────────────────────

export default function AdminCronPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, CronResult | { error: string }>>({})

  // Auth guard (layout already handles this, but belt-and-braces)
  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8e1de] border-t-[#1A1A1A]" />
      </div>
    )
  }

  if (status === 'unauthenticated' || (session?.user as { role?: string })?.role !== 'ADMIN') {
    router.push('/login')
    return null
  }

  async function triggerCron(cronName: CronName) {
    setRunning(prev => ({ ...prev, [cronName]: true }))
    setResults(prev => {
      const next = { ...prev }
      delete next[cronName]
      return next
    })

    try {
      const res = await fetch('/api/admin/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronName }),
      })
      const json = await res.json()
      setResults(prev => ({ ...prev, [cronName]: json }))
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [cronName]: { error: (err as Error).message },
      }))
    } finally {
      setRunning(prev => ({ ...prev, [cronName]: false }))
    }
  }

  return (
    <div className="font-jakarta">

      {/* ─── Header ─── */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to admin
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-headline text-3xl text-[#1A1A1A] mb-1">Cron jobs</h1>
            <p className="text-sm text-[#717171]">Manually trigger scheduled tasks for testing or emergencies</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#717171] bg-[#f3ece9] px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            {CRON_JOBS.length} jobs
          </div>
        </div>
      </div>

      {/* ─── Cron job cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CRON_JOBS.map(job => {
          const isRunning = running[job.name]
          const result = results[job.name]
          const hasError = result && 'error' in result
          const hasResult = result && !hasError
          const isSuccess = hasResult && (result as CronResult).ok

          return (
            <div
              key={job.name}
              className="bg-white rounded-2xl border border-[#e8e1de] p-5 flex flex-col gap-3"
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-headline text-base text-[#1A1A1A] leading-snug">{job.label}</h2>
                  <p className="text-xs text-[#717171] mt-1 leading-relaxed">{job.description}</p>
                </div>
              </div>

              {/* Last run placeholder */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#717171]">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>Last run: —</span>
              </div>

              {/* Run button */}
              <button
                onClick={() => triggerCron(job.name)}
                disabled={isRunning}
                className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#E96B56] text-white text-sm font-semibold px-4 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Run now
                  </>
                )}
              </button>

              {/* Result output */}
              {hasResult && (
                <div className="space-y-1">
                  <div className={`text-[11px] font-semibold ${isSuccess ? 'text-emerald-700' : 'text-[#a63a29]'}`}>
                    {isSuccess ? 'Completed successfully' : `Error — HTTP ${(result as CronResult).status}`}
                  </div>
                  <pre className="bg-[#f9f2ef] rounded-xl p-3 text-xs text-[#1A1A1A] overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify((result as CronResult).result, null, 2)}
                  </pre>
                </div>
              )}

              {hasError && (
                <p className="text-xs text-[#a63a29] font-medium">
                  {(result as { error: string }).error}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
