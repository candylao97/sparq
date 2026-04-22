'use client'

import Link from 'next/link'
import { Banknote, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardNextPayout } from '@/types/dashboard'

interface Props {
  nextPayout: DashboardNextPayout | null
}

function formatScheduledDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function NextPayoutCard({ nextPayout }: Props) {
  if (!nextPayout) {
    return (
      <section className="mt-6 rounded-2xl border border-[#e8e1de] bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f9f2ef]">
            <Banknote className="h-5 w-5 text-[#717171]" />
          </div>
          <div>
            <h3 className="font-headline text-base text-[#1A1A1A]">Next payout</h3>
            <p className="text-sm text-[#717171]">No payouts queued. Completed bookings will appear here.</p>
          </div>
        </div>
      </section>
    )
  }

  const { next, totalScheduled, queuedCount } = nextPayout
  const extraQueued = queuedCount - 1

  return (
    <section className="mt-6 rounded-2xl border border-[#e8e1de] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${next.isOverdue ? 'bg-[#fdecec]' : 'bg-[#f9f2ef]'}`}>
            {next.isOverdue
              ? <AlertCircle className="h-5 w-5 text-[#a63a29]" />
              : <Banknote className="h-5 w-5 text-[#E96B56]" />}
          </div>
          <div>
            <h3 className="font-headline text-base text-[#1A1A1A]">Next payout</h3>
            <p className="mt-0.5 text-2xl font-semibold text-[#1A1A1A]">
              {formatCurrency(next.amount)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#717171]">
              <Clock className="h-3.5 w-3.5" />
              {next.isOverdue ? (
                <span className="text-[#a63a29]">Processing — was due {formatScheduledDate(next.scheduledAt)}</span>
              ) : (
                <span>Scheduled {formatScheduledDate(next.scheduledAt)}</span>
              )}
            </p>
            {extraQueued > 0 && (
              <p className="mt-1 text-sm text-[#717171]">
                + {extraQueued} more queued · {formatCurrency(totalScheduled)} total
              </p>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/provider/payouts"
          className="group inline-flex items-center gap-1 text-sm font-medium text-[#1A1A1A] hover:text-[#E96B56]"
        >
          All payouts
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}
