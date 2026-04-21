/**
 * AUDIT-011 — next-payout helper tests.
 *
 * Locks in the three invariants the dashboard UI depends on:
 *   1. Only positive SCHEDULED/PROCESSING payouts appear — penalty
 *      offsets (amount <= 0) must be hidden.
 *   2. The "next" pick is always the earliest scheduledAt.
 *   3. `isOverdue` is true iff scheduledAt <= now (the cron is late).
 */

import {
  computeNextPayoutSummary,
  type NextPayoutInput,
} from '@/lib/next-payout'

const NOW = new Date('2026-04-21T10:00:00Z')

// Helper to keep cases terse.
const mk = (over: Partial<NextPayoutInput>): NextPayoutInput => ({
  id: 'p1',
  amount: 100,
  status: 'SCHEDULED',
  scheduledAt: NOW.toISOString(),
  ...over,
})

describe('computeNextPayoutSummary', () => {
  it('returns null when there are no payouts at all', () => {
    expect(computeNextPayoutSummary([], NOW)).toBeNull()
  })

  it('returns null when all payouts are in terminal states', () => {
    expect(
      computeNextPayoutSummary(
        [
          mk({ status: 'COMPLETED' }),
          mk({ id: 'p2', status: 'FAILED' }),
          mk({ id: 'p3', status: 'CANCELLED' }),
        ],
        NOW,
      ),
    ).toBeNull()
  })

  it('excludes negative and zero-amount payouts (penalties / offsets)', () => {
    const result = computeNextPayoutSummary(
      [
        mk({ id: 'penalty', amount: -50 }),
        mk({ id: 'zero', amount: 0 }),
      ],
      NOW,
    )
    expect(result).toBeNull()
  })

  it('picks the earliest scheduledAt as "next"', () => {
    const later = new Date(NOW.getTime() + 3 * 86_400_000) // +3 days
    const sooner = new Date(NOW.getTime() + 1 * 86_400_000) // +1 day
    const result = computeNextPayoutSummary(
      [
        mk({ id: 'later', amount: 200, scheduledAt: later }),
        mk({ id: 'sooner', amount: 150, scheduledAt: sooner }),
      ],
      NOW,
    )
    expect(result).not.toBeNull()
    expect(result!.next.id).toBe('sooner')
    expect(result!.next.amount).toBe(150)
    expect(result!.queuedCount).toBe(2)
    expect(result!.totalScheduled).toBe(350)
  })

  it('marks isOverdue=true for scheduledAt in the past', () => {
    const past = new Date(NOW.getTime() - 86_400_000) // yesterday
    const result = computeNextPayoutSummary(
      [mk({ scheduledAt: past })],
      NOW,
    )
    expect(result!.next.isOverdue).toBe(true)
  })

  it('marks isOverdue=false for scheduledAt in the future', () => {
    const future = new Date(NOW.getTime() + 86_400_000)
    const result = computeNextPayoutSummary(
      [mk({ scheduledAt: future })],
      NOW,
    )
    expect(result!.next.isOverdue).toBe(false)
  })

  it('treats scheduledAt === now as overdue (boundary)', () => {
    const result = computeNextPayoutSummary([mk({ scheduledAt: NOW })], NOW)
    expect(result!.next.isOverdue).toBe(true)
  })

  it('includes PROCESSING payouts in queued total', () => {
    const result = computeNextPayoutSummary(
      [
        mk({ id: 'a', status: 'SCHEDULED', amount: 100 }),
        mk({ id: 'b', status: 'PROCESSING', amount: 250 }),
      ],
      NOW,
    )
    expect(result!.queuedCount).toBe(2)
    expect(result!.totalScheduled).toBe(350)
  })

  it('rounds totalScheduled to 2 decimal places (no float drift)', () => {
    const result = computeNextPayoutSummary(
      [
        mk({ id: 'a', amount: 10.1 }),
        mk({ id: 'b', amount: 20.2 }),
        mk({ id: 'c', amount: 30.3 }),
      ],
      NOW,
    )
    // Native sum would be 60.599999999999994 — helper must round it.
    expect(result!.totalScheduled).toBe(60.6)
  })

  it('accepts ISO string scheduledAt (from JSON-serialised input)', () => {
    const future = new Date(NOW.getTime() + 86_400_000).toISOString()
    const result = computeNextPayoutSummary(
      [mk({ scheduledAt: future })],
      NOW,
    )
    expect(result!.next.scheduledAt).toBe(future)
    expect(result!.next.isOverdue).toBe(false)
  })
})
