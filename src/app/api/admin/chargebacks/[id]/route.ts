/**
 * AUDIT-014 — Single-chargeback detail + evidence submission.
 *
 * GET  /api/admin/chargebacks/:id       → full dispute + booking + suggested evidence defaults
 * POST /api/admin/chargebacks/:id        → submit evidence to Stripe
 *
 * POST payload: { evidence: { product_description?: string, service_date?: string, ... }, submit?: boolean }
 * - submit=false (default) → save draft (Stripe supports this — evidence is persisted server-side
 *   until submitted)
 * - submit=true            → mark as final submission (Stripe locks evidence and begins review)
 *
 * Service-marketplace evidence playbook:
 * - product_description       → the service description
 * - service_date              → booking date
 * - customer_communication    → chat transcript / confirmation email
 * - customer_name / email     → identity confirmation
 * - billing_address           → address the customer booked from
 * - cancellation_policy_disclosure + refund_policy_disclosure → our T&Cs
 * - refund_refusal_explanation → why this charge was legitimate
 * - uncategorized_text        → free-form narrative
 *
 * We intentionally do not accept file uploads in this version — all fields
 * are text. Stripe file tokens require a separate multipart upload flow
 * which is follow-up scope.
 */

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

// Text-only evidence fields we let admins edit. Keeping the allowlist
// explicit prevents someone from accidentally submitting an arbitrary
// Stripe evidence key (some are file refs we don't support yet).
const ALLOWED_EVIDENCE_FIELDS = [
  'product_description',
  'service_date',
  'customer_communication',
  'customer_email_address',
  'customer_name',
  'customer_purchase_ip',
  'billing_address',
  'cancellation_policy_disclosure',
  'cancellation_rebuttal',
  'refund_policy_disclosure',
  'refund_refusal_explanation',
  'duplicate_charge_explanation',
  'access_activity_log',
  'uncategorized_text',
] as const

type EvidenceField = (typeof ALLOWED_EVIDENCE_FIELDS)[number]

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dispute = await stripe.disputes.retrieve(params.id)
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? null
    const charge = chargeId ? await stripe.charges.retrieve(chargeId) : null
    const piId = charge && (typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id)

    const booking = piId
      ? await prisma.booking.findFirst({
          where: { stripePaymentId: piId },
          include: {
            customer: { select: { id: true, name: true, email: true } },
            provider: { select: { id: true, name: true, email: true } },
            service: { select: { title: true, description: true } },
            messages: {
              orderBy: { createdAt: 'asc' },
              select: { id: true, senderId: true, text: true, createdAt: true },
              take: 200,
            },
          },
        })
      : null

    return NextResponse.json({
      dispute: {
        id: dispute.id,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        status: dispute.status,
        reason: dispute.reason,
        created: dispute.created,
        evidenceDueBy: dispute.evidence_details?.due_by ?? null,
        hasEvidence: dispute.evidence_details?.has_evidence ?? false,
        submissionCount: dispute.evidence_details?.submission_count ?? 0,
        evidence: dispute.evidence ?? {},
      },
      booking,
      suggested: suggestedEvidence(dispute, booking),
    })
  } catch (err) {
    console.error(`[chargebacks.get ${params.id}] error:`, err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to load chargeback' },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { evidence?: Record<string, unknown>, submit?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const incoming = body.evidence ?? {}
  const submit = body.submit === true

  // Whitelist + coerce to string.
  const evidence: Partial<Record<EvidenceField, string>> = {}
  for (const field of ALLOWED_EVIDENCE_FIELDS) {
    const raw = incoming[field]
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      // Stripe treats empty string as "clear this field" — preserve that.
      evidence[field] = trimmed
    }
  }

  try {
    const updated = await stripe.disputes.update(params.id, {
      evidence: evidence as Stripe.DisputeUpdateParams['evidence'],
      ...(submit ? { submit: true } : {}),
      metadata: {
        submitted_by: (session.user as { id?: string }).id ?? 'admin',
        submitted_at: new Date().toISOString(),
        final_submission: String(submit),
      },
    })

    // Best-effort audit trail: stash what we submitted on the internal Dispute
    // record (if one exists for this booking) so we have a local copy that
    // survives a Stripe outage. No-op when there's no matching Dispute row.
    try {
      const chargeId = typeof updated.charge === 'string' ? updated.charge : updated.charge?.id ?? null
      const charge = chargeId ? await stripe.charges.retrieve(chargeId) : null
      const piId = charge && (typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id)
      const booking = piId
        ? await prisma.booking.findFirst({ where: { stripePaymentId: piId } })
        : null
      if (booking) {
        const combined = Object.entries(evidence)
          .filter(([, v]) => v && v.length > 0)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n\n---\n\n')
        await prisma.dispute.updateMany({
          where: { bookingId: booking.id },
          data: {
            evidence: combined || null,
            status: submit ? 'UNDER_REVIEW' : 'OPEN',
          },
        })
      }
    } catch (auditErr) {
      console.warn(`[chargebacks.post ${params.id}] audit-trail write failed:`, auditErr)
    }

    return NextResponse.json({
      ok: true,
      submitted: submit,
      dispute: {
        id: updated.id,
        status: updated.status,
        hasEvidence: updated.evidence_details?.has_evidence ?? false,
        submissionCount: updated.evidence_details?.submission_count ?? 0,
      },
    })
  } catch (err) {
    console.error(`[chargebacks.post ${params.id}] error:`, err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to submit evidence' },
      { status: 500 },
    )
  }
}

type BookingDetail = Awaited<ReturnType<typeof prisma.booking.findFirst>> & {
  customer?: { name?: string | null, email?: string | null } | null
  provider?: { name?: string | null, email?: string | null } | null
  service?: { title?: string | null, description?: string | null } | null
  messages?: Array<{ senderId: string, text: string, createdAt: Date }> | null
}

/**
 * Pre-populate evidence fields from booking data so admins aren't typing
 * the obvious facts (service description, date, customer identity).
 */
function suggestedEvidence(
  _dispute: Stripe.Dispute,
  booking: BookingDetail | null,
): Partial<Record<EvidenceField, string>> {
  if (!booking) return {}
  const suggested: Partial<Record<EvidenceField, string>> = {}

  if (booking.service?.description) {
    suggested.product_description = booking.service.description.slice(0, 20000)
  } else if (booking.service?.title) {
    suggested.product_description = `Appointment for "${booking.service.title}"`
  }

  if (booking.date) {
    const d = new Date(booking.date)
    suggested.service_date = d.toISOString().slice(0, 10)
  }

  if (booking.customer?.email) {
    suggested.customer_email_address = booking.customer.email
  }
  if (booking.customer?.name) {
    suggested.customer_name = booking.customer.name
  }

  // Assemble a chat transcript if we have one — helps refute "didn't order"
  // / "didn't receive service" claims.
  if (Array.isArray(booking.messages) && booking.messages.length > 0) {
    const transcript = booking.messages
      .slice(0, 100)
      .map(m => `${m.createdAt.toISOString()} [user ${m.senderId}]: ${m.text}`)
      .join('\n')
    suggested.customer_communication = transcript.slice(0, 20000)
  }

  suggested.cancellation_policy_disclosure =
    'Customer agreed to the platform cancellation policy at checkout. Free cancellation up to 24 hours before the appointment; cancellations within 24 hours forfeit the full amount. Terms displayed on every booking screen.'
  suggested.refund_policy_disclosure =
    'Platform refund policy is presented to customers at checkout and available at /trust. Refunds are issued only for cancellations made before the policy cutoff or for verified service failures.'

  return suggested
}
