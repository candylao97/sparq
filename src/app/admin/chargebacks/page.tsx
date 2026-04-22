'use client'

/**
 * AUDIT-014 — Admin chargeback defense UI.
 *
 * Lists open Stripe disputes (chargebacks) and lets an admin upload
 * evidence via Stripe's Disputes API. Text-only evidence for now — file
 * uploads require Stripe file tokens (follow-up).
 *
 * This is intentionally separate from /admin/disputes, which covers our
 * internal user-initiated dispute flow.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock, RefreshCw, Check, X, FileText, Send } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type ChargebackListItem = {
  id: string
  chargeId: string | null
  paymentIntentId: string | null
  amount: number
  currency: string
  status: string
  reason: string
  created: number
  evidenceDueBy: number | null
  hasEvidence: boolean
  submissionCount: number
  booking: {
    id: string
    date: string
    time: string
    totalPrice: number
    status: string
    customer: { id: string, name: string | null, email: string | null } | null
    provider: { id: string, name: string | null, email: string | null } | null
    service: { title: string, description: string | null } | null
  } | null
  evidencePresent: Record<string, boolean>
}

type ChargebackDetail = {
  dispute: {
    id: string
    amount: number
    currency: string
    status: string
    reason: string
    evidenceDueBy: number | null
    hasEvidence: boolean
    submissionCount: number
    evidence: Record<string, string | null>
  }
  booking: ChargebackListItem['booking']
  suggested: Record<string, string>
}

const EVIDENCE_FIELDS: Array<{ key: string, label: string, hint: string, rows?: number }> = [
  { key: 'product_description', label: 'Service description', hint: 'The service the customer paid for.', rows: 3 },
  { key: 'service_date', label: 'Service date (YYYY-MM-DD)', hint: 'The date the appointment was or would have been rendered.' },
  { key: 'customer_name', label: 'Customer name', hint: 'Name on the booking.' },
  { key: 'customer_email_address', label: 'Customer email', hint: 'Email on the booking.' },
  { key: 'customer_communication', label: 'Customer communication', hint: 'Chat transcript, confirmation emails, anything showing the customer acknowledged the service.', rows: 6 },
  { key: 'billing_address', label: 'Billing address', hint: 'Address provided at checkout.', rows: 2 },
  { key: 'cancellation_policy_disclosure', label: 'Cancellation policy disclosed', hint: 'When + how the policy was shown. Stripe wants dates & URLs.', rows: 3 },
  { key: 'refund_policy_disclosure', label: 'Refund policy disclosed', hint: 'When + how the refund terms were shown.', rows: 3 },
  { key: 'refund_refusal_explanation', label: 'Why refund was refused', hint: 'Plain-language justification if the customer asked for a refund and we said no.', rows: 3 },
  { key: 'uncategorized_text', label: 'Additional notes', hint: 'Anything else. Attach URLs to evidence too large for this form.', rows: 4 },
]

const REASON_LABEL: Record<string, string> = {
  credit_not_processed: 'Credit not processed',
  duplicate: 'Duplicate charge',
  fraudulent: 'Fraudulent',
  general: 'General',
  incorrect_account_details: 'Incorrect account details',
  insufficient_funds: 'Insufficient funds',
  product_not_received: 'Product not received',
  product_unacceptable: 'Product unacceptable',
  subscription_canceled: 'Subscription canceled',
  unrecognized: 'Unrecognized',
}

const STATUS_STYLE: Record<string, string> = {
  warning_needs_response: 'bg-amber-50 text-amber-700 border border-amber-200',
  needs_response: 'bg-red-50 text-red-700 border border-red-200',
  warning_under_review: 'bg-sky-50 text-sky-700 border border-sky-200',
  under_review: 'bg-sky-50 text-sky-700 border border-sky-200',
  won: 'bg-green-50 text-green-700 border border-green-200',
  lost: 'bg-[#f3ece9] text-[#717171] border border-[#e8e1de]',
  charge_refunded: 'bg-[#f3ece9] text-[#717171] border border-[#e8e1de]',
}

function formatDueDate(unix: number | null): { label: string, tone: 'urgent' | 'warn' | 'ok' } {
  if (!unix) return { label: '—', tone: 'ok' }
  const ms = unix * 1000 - Date.now()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (ms <= 0) return { label: 'Past due', tone: 'urgent' }
  if (days === 0) return { label: `${hours}h left`, tone: 'urgent' }
  if (days <= 2) return { label: `${days}d ${hours}h`, tone: 'urgent' }
  if (days <= 5) return { label: `${days}d ${hours}h`, tone: 'warn' }
  return { label: `${days}d ${hours}h`, tone: 'ok' }
}

export default function AdminChargebacks() {
  const [chargebacks, setChargebacks] = useState<ChargebackListItem[]>([])
  const [scope, setScope] = useState<'open' | 'all'>('open')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<ChargebackDetail | null>(null)
  const [selectedLoading, setSelectedLoading] = useState(false)
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<'draft' | 'final' | null>(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setErr(null)
    fetch(`/api/admin/chargebacks?scope=${scope}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load')
        return r.json()
      })
      .then(d => setChargebacks(d.chargebacks ?? []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [scope])

  useEffect(() => { fetchList() }, [fetchList])

  const openDetail = async (id: string) => {
    setSelectedLoading(true)
    setSelected(null)
    try {
      const res = await fetch(`/api/admin/chargebacks/${id}`)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load')
      const data: ChargebackDetail = await res.json()
      setSelected(data)
      // Hydrate draft from existing evidence, falling back to suggestions.
      const draft: Record<string, string> = {}
      for (const f of EVIDENCE_FIELDS) {
        const existing = data.dispute.evidence?.[f.key]
        if (typeof existing === 'string' && existing.length > 0) {
          draft[f.key] = existing
        } else if (data.suggested[f.key]) {
          draft[f.key] = data.suggested[f.key]
        } else {
          draft[f.key] = ''
        }
      }
      setEvidenceDraft(draft)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSelectedLoading(false)
    }
  }

  const closeDetail = () => {
    setSelected(null)
    setEvidenceDraft({})
  }

  const submit = async (final: boolean) => {
    if (!selected) return
    if (final && !window.confirm(
      'Submitting evidence is final — Stripe will begin review and no further evidence can be added. Continue?',
    )) return
    setSubmitting(final ? 'final' : 'draft')
    try {
      const res = await fetch(`/api/admin/chargebacks/${selected.dispute.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence: evidenceDraft, submit: final }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Submit failed')
      closeDetail()
      fetchList()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSubmitting(null)
    }
  }

  const summary = useMemo(() => ({
    total: chargebacks.length,
    urgent: chargebacks.filter(c => {
      if (!c.evidenceDueBy) return false
      return c.evidenceDueBy * 1000 - Date.now() < 2 * 24 * 60 * 60 * 1000
    }).length,
    drafted: chargebacks.filter(c => c.hasEvidence).length,
  }), [chargebacks])

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-[#1A1A1A]">Chargebacks</h1>
          <p className="mt-1 text-sm text-[#717171]">
            Stripe disputes awaiting evidence. Submit defense before the due date or the chargeback is lost by default.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchList}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e8e1de] bg-white px-3 py-2 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={summary.total.toString()} />
        <StatCard label="Due in < 48h" value={summary.urgent.toString()} tone={summary.urgent > 0 ? 'urgent' : 'ok'} />
        <StatCard label="Evidence drafted" value={summary.drafted.toString()} />
      </div>

      <div className="mb-4 flex gap-2">
        <ScopePill active={scope === 'open'} onClick={() => setScope('open')}>Needs response</ScopePill>
        <ScopePill active={scope === 'all'} onClick={() => setScope('all')}>All (incl. closed)</ScopePill>
      </div>

      {err && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {err}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#e8e1de] bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#717171]">Loading chargebacks…</div>
        ) : chargebacks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-[#717171]">
            <Check className="h-6 w-6 text-green-600" />
            No open chargebacks. Great — keep an eye on this page weekly.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f9f2ef] text-left text-xs uppercase tracking-wide text-[#717171]">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer / Booking</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ece9]">
              {chargebacks.map(c => {
                const due = formatDueDate(c.evidenceDueBy)
                return (
                  <tr key={c.id} className="hover:bg-[#FDFBF7]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1A1A1A]">
                        {c.booking?.customer?.name ?? c.booking?.customer?.email ?? '(unknown customer)'}
                      </div>
                      <div className="text-xs text-[#717171]">
                        {c.booking?.service?.title ?? '—'} · {c.booking?.id ? `booking ${c.booking.id.slice(0, 8)}` : c.id.slice(0, 14)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#1A1A1A]">
                      {REASON_LABEL[c.reason] ?? c.reason}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1A1A1A]">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        due.tone === 'urgent' ? 'text-red-700' :
                        due.tone === 'warn' ? 'text-amber-700' :
                        'text-[#717171]'
                      }`}>
                        <Clock className="h-3 w-3" /> {due.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status] ?? 'bg-[#f3ece9] text-[#717171]'}`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(c.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
                      >
                        <FileText className="h-3 w-3" /> {c.hasEvidence ? 'Edit evidence' : 'Add evidence'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {(selected || selectedLoading) && (
        <EvidenceModal
          detail={selected}
          loading={selectedLoading}
          draft={evidenceDraft}
          onDraftChange={setEvidenceDraft}
          onClose={closeDetail}
          onSubmitDraft={() => submit(false)}
          onSubmitFinal={() => submit(true)}
          submitting={submitting}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, tone = 'ok' }: { label: string, value: string, tone?: 'ok' | 'urgent' }) {
  return (
    <div className="rounded-xl border border-[#e8e1de] bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[#717171]">{label}</div>
      <div className={`mt-1 font-headline text-3xl ${tone === 'urgent' ? 'text-red-700' : 'text-[#1A1A1A]'}`}>{value}</div>
    </div>
  )
}

function ScopePill({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-[#1A1A1A] text-white'
          : 'bg-white text-[#717171] border border-[#e8e1de] hover:text-[#1A1A1A]'
      }`}
    >
      {children}
    </button>
  )
}

function EvidenceModal({
  detail, loading, draft, onDraftChange, onClose, onSubmitDraft, onSubmitFinal, submitting,
}: {
  detail: ChargebackDetail | null
  loading: boolean
  draft: Record<string, string>
  onDraftChange: (d: Record<string, string>) => void
  onClose: () => void
  onSubmitDraft: () => void
  onSubmitFinal: () => void
  submitting: 'draft' | 'final' | null
}) {
  const due = detail?.dispute.evidenceDueBy ? formatDueDate(detail.dispute.evidenceDueBy) : null
  const alreadySubmitted = detail?.dispute.hasEvidence === true && detail?.dispute.status !== 'needs_response' && detail?.dispute.status !== 'warning_needs_response'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-[#e8e1de] bg-white p-5">
          <div>
            <h2 className="font-headline text-xl text-[#1A1A1A]">
              Chargeback evidence
            </h2>
            {detail && (
              <p className="mt-1 text-xs text-[#717171]">
                {formatCurrency(detail.dispute.amount)} · {REASON_LABEL[detail.dispute.reason] ?? detail.dispute.reason}
                {due ? ` · ${due.label} to submit` : ''}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-[#717171] hover:text-[#1A1A1A]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {loading || !detail ? (
            <div className="flex items-center justify-center py-10 text-sm text-[#717171]">Loading…</div>
          ) : alreadySubmitted ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              Evidence has already been submitted to Stripe (status: <strong>{detail.dispute.status.replace(/_/g, ' ')}</strong>).
              Further edits are not allowed until Stripe reopens the case.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#e8e1de] bg-[#FDFBF7] p-4 text-xs text-[#717171]">
                <div className="font-medium text-[#1A1A1A]">Booking on file</div>
                {detail.booking ? (
                  <div className="mt-1 space-y-0.5">
                    <div>{detail.booking.service?.title ?? '—'}</div>
                    <div>{detail.booking.customer?.name} · {detail.booking.customer?.email}</div>
                    <div>{new Date(detail.booking.date).toLocaleDateString()} at {detail.booking.time}</div>
                  </div>
                ) : (
                  <div className="mt-1 italic">No matching booking found for this PaymentIntent.</div>
                )}
              </div>

              {EVIDENCE_FIELDS.map(f => (
                <div key={f.key}>
                  <label htmlFor={`ev-${f.key}`} className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    {f.label}
                  </label>
                  <textarea
                    id={`ev-${f.key}`}
                    rows={f.rows ?? 1}
                    value={draft[f.key] ?? ''}
                    onChange={e => onDraftChange({ ...draft, [f.key]: e.target.value })}
                    className="w-full resize-y rounded-lg border border-[#e8e1de] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#E96B56] focus:outline-none"
                    placeholder={f.hint}
                  />
                  <p className="mt-1 text-xs text-[#717171]">{f.hint}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-b-2xl border-t border-[#e8e1de] bg-white p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e8e1de] bg-white px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef]"
          >
            Close
          </button>
          {!alreadySubmitted && detail && (
            <>
              <button
                type="button"
                onClick={onSubmitDraft}
                disabled={submitting !== null}
                className="rounded-lg border border-[#e8e1de] bg-white px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] disabled:opacity-50"
              >
                {submitting === 'draft' ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                onClick={onSubmitFinal}
                disabled={submitting !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E96B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#a63a29] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitting === 'final' ? 'Submitting…' : 'Submit to Stripe'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
