/**
 * AUDIT-011 — Next-payout summary helper.
 *
 * Talents couldn't tell when their next payout was coming without
 * digging through the payout-history table. This pure helper compresses
 * the list of non-terminal payouts into the three numbers we want to
 * surface on the dashboard:
 *
 *   - next: the soonest SCHEDULED/PROCESSING payout
 *   - totalScheduled: sum of amounts across all queued positive payouts
 *   - queuedCount: how many bookings are behind the number
 *
 * Negative/zero payouts (penalties, offset payouts) are excluded from
 * the display — they're an internal accounting detail, not money the
 * talent is about to receive. See `src/app/api/cron/process-payouts`
 * for how those are generated and later cancelled-out.
 */
export interface NextPayoutInput {
  id: string
  amount: number
  status: string
  scheduledAt: Date | string
}

export interface NextPayoutSummary {
  /** Soonest queued payout. `isOverdue` === scheduledAt <= now. */
  next: {
    id: string
    amount: number
    scheduledAt: string
    isOverdue: boolean
    status: string
  }
  /** Sum of all queued SCHEDULED + PROCESSING positive payouts (incl. `next`). */
  totalScheduled: number
  /** How many payouts are queued (incl. `next`). */
  queuedCount: number
}

const QUEUED_STATUSES = new Set(['SCHEDULED', 'PROCESSING'])

export function computeNextPayoutSummary(
  payouts: NextPayoutInput[],
  now: Date = new Date(),
): NextPayoutSummary | null {
  // Only positive, queued payouts are surfaced to the talent.
  const queued = payouts.filter(
    p => QUEUED_STATUSES.has(p.status) && p.amount > 0,
  )
  if (queued.length === 0) return null

  const sorted = [...queued].sort((a, b) => {
    const aT = new Date(a.scheduledAt).getTime()
    const bT = new Date(b.scheduledAt).getTime()
    return aT - bT
  })

  const soonest = sorted[0]
  const scheduledAtDate = new Date(soonest.scheduledAt)
  const totalScheduled = queued.reduce((sum, p) => sum + p.amount, 0)

  return {
    next: {
      id: soonest.id,
      amount: soonest.amount,
      scheduledAt: scheduledAtDate.toISOString(),
      isOverdue: scheduledAtDate.getTime() <= now.getTime(),
      status: soonest.status,
    },
    // Round to 2dp so the number matches formatCurrency in the UI (avoids
    // "$123.4500000001" floating-point drift when several payouts stack).
    totalScheduled: Math.round(totalScheduled * 100) / 100,
    queuedCount: queued.length,
  }
}
