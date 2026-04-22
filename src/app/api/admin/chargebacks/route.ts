/**
 * AUDIT-014 — Admin chargeback defense API (list).
 *
 * Why this is distinct from /api/admin/disputes: the `Dispute` model covers
 * *user-initiated* disputes filed through our own product (customer clicks
 * "dispute this booking"). A Stripe chargeback is a completely separate
 * event — raised at the cardholder's bank, landing in our system via the
 * `charge.dispute.*` webhook, and defended through Stripe's Disputes API,
 * not through our own tables. Before this audit the platform had no admin
 * surface to see pending chargebacks or submit evidence, so every
 * chargeback auto-lost when the 7-day response window expired.
 *
 * This endpoint queries Stripe directly (source of truth) and joins each
 * dispute to the local booking by the PaymentIntent ID on the charge. That
 * way the admin sees the real evidence deadline Stripe is showing, not a
 * stale DB copy.
 */

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') ?? 'open' // 'open' | 'all'

  try {
    // Stripe's disputes list returns newest first. 100 is the API max per page;
    // if chargeback volume ever exceeds that we'll add cursor pagination.
    const disputeList = await stripe.disputes.list({ limit: 100 })

    // Filter to evidence-actionable disputes for the default view. Stripe
    // statuses that allow evidence submission: warning_needs_response,
    // warning_under_review, needs_response, under_review.
    const openStatuses = new Set([
      'warning_needs_response',
      'warning_under_review',
      'needs_response',
      'under_review',
    ])
    const filtered = scope === 'open'
      ? disputeList.data.filter(d => openStatuses.has(d.status))
      : disputeList.data

    // Resolve the PaymentIntent ID for each dispute. `charge` may be expanded
    // or a bare string — handle both. Then look up bookings in one pass.
    const chargeIds = filtered
      .map(d => (typeof d.charge === 'string' ? d.charge : d.charge?.id))
      .filter((id): id is string => Boolean(id))

    const piByCharge = new Map<string, string>()
    // Fetch all charges in parallel to resolve paymentIntent IDs
    await Promise.all(
      chargeIds.map(async chargeId => {
        try {
          const ch = await stripe.charges.retrieve(chargeId)
          const piId = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id
          if (piId) piByCharge.set(chargeId, piId)
        } catch (err) {
          console.warn(`[chargebacks.list] Failed to retrieve charge ${chargeId}:`, err)
        }
      }),
    )

    const piIds = Array.from(piByCharge.values())
    const bookings = piIds.length > 0
      ? await prisma.booking.findMany({
          where: { stripePaymentId: { in: piIds } },
          include: {
            customer: { select: { id: true, name: true, email: true } },
            provider: { select: { id: true, name: true, email: true } },
            service: { select: { title: true, description: true } },
          },
        })
      : []
    const bookingByPi = new Map(bookings.map(b => [b.stripePaymentId!, b]))

    const enriched = filtered.map(d => {
      const chargeId = typeof d.charge === 'string' ? d.charge : d.charge?.id ?? null
      const piId = chargeId ? piByCharge.get(chargeId) : undefined
      const booking = piId ? bookingByPi.get(piId) : undefined
      return {
        id: d.id,
        chargeId,
        paymentIntentId: piId ?? null,
        amount: d.amount / 100,
        currency: d.currency,
        status: d.status,
        reason: d.reason,
        created: d.created,
        evidenceDueBy: d.evidence_details?.due_by ?? null,
        hasEvidence: d.evidence_details?.has_evidence ?? false,
        submissionCount: d.evidence_details?.submission_count ?? 0,
        booking: booking ? {
          id: booking.id,
          date: booking.date,
          time: booking.time,
          totalPrice: booking.totalPrice,
          status: booking.status,
          customer: booking.customer,
          provider: booking.provider,
          service: booking.service,
        } : null,
        evidencePresent: summarizeEvidencePresent(d.evidence),
      }
    })

    return NextResponse.json({ chargebacks: enriched })
  } catch (err) {
    console.error('[chargebacks.list] error:', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to load chargebacks' },
      { status: 500 },
    )
  }
}

/**
 * Returns the subset of text evidence fields that are already populated
 * on the dispute — used by the admin UI to show "evidence complete" state.
 */
function summarizeEvidencePresent(
  evidence: Stripe.Dispute.Evidence | null | undefined,
): Record<string, boolean> {
  if (!evidence) return {}
  const fields: (keyof Stripe.Dispute.Evidence)[] = [
    'product_description',
    'service_date',
    'customer_communication',
    'customer_email_address',
    'customer_name',
    'billing_address',
    'cancellation_policy_disclosure',
    'refund_policy_disclosure',
    'refund_refusal_explanation',
    'uncategorized_text',
  ]
  const out: Record<string, boolean> = {}
  for (const f of fields) {
    const v = evidence[f]
    out[f as string] = typeof v === 'string' ? v.trim().length > 0 : Boolean(v)
  }
  return out
}
