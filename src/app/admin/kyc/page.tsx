'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, ShieldCheck, ShieldX, Shield, AlertTriangle, CheckCircle2,
  XCircle, MessageSquare, Flag, RefreshCw, X, ExternalLink,
  ChevronRight, Clock, Zap,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type KYCRecord = {
  id: string
  status: string
  riskLevel: string
  riskSignals: RiskSignal[] | null
  stripeStatus: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requirementsDue: string[] | null
  adminNotes: string | null
  rejectedReason: string | null
  reviewedAt: string | null
}

type RiskSignal = {
  code: string
  label: string
  severity: 'low' | 'medium' | 'high'
}

type ProviderRow = {
  id: string
  suburb: string | null
  city: string
  stripeAccountId: string | null
  stripeDetailsSubmitted: boolean
  isVerified: boolean
  accountStatus: string
  createdAt: string
  user: { id: string; name: string | null; email: string | null; image: string | null; createdAt: string }
  kycRecord: KYCRecord | null
  verification: { status: string } | null
  _count: { services: number; bookings: number }
}

type ProviderDetail = ProviderRow & {
  services: { id: string; title: string; price: number; isActive: boolean; category: string }[]
  portfolio: { url: string; caption: string | null }[]
  bookings: { id: string; status: string; totalPrice: number; createdAt: string }[]
  scoreFactors: { reviewScore: number; completionScore: number; responseScore: number } | null
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const KYC_STATUS: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:          { label: 'Pending',         cls: 'bg-[#f9f2ef] text-[#717171]',    icon: Clock },
  REQUIRES_ACTION:  { label: 'Requires Action', cls: 'bg-amber-50 text-amber-700',      icon: AlertTriangle },
  UNDER_REVIEW:     { label: 'Under Review',    cls: 'bg-blue-50 text-blue-700',        icon: Shield },
  VERIFIED:         { label: 'Verified',        cls: 'bg-green-50 text-green-700',      icon: ShieldCheck },
  REJECTED:         { label: 'Rejected',        cls: 'bg-red-50 text-red-700',          icon: ShieldX },
}

const RISK_LEVEL: Record<string, { label: string; cls: string }> = {
  LOW:    { label: 'Low Risk',    cls: 'bg-green-50 text-green-700' },
  MEDIUM: { label: 'Medium Risk', cls: 'bg-amber-50 text-amber-700' },
  HIGH:   { label: 'High Risk',   cls: 'bg-red-50 text-red-700' },
}

const SIGNAL_SEVERITY: Record<string, string> = {
  high:   'text-red-600 bg-red-50 border-red-100',
  medium: 'text-amber-600 bg-amber-50 border-amber-100',
  low:    'text-[#717171] bg-[#f9f2ef] border-[#e8e1de]',
}

function KYCBadge({ status }: { status: string }) {
  const cfg = KYC_STATUS[status] || KYC_STATUS.PENDING
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_LEVEL[level] || RISK_LEVEL.LOW
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  providerId,
  onClose,
  onAction,
}: {
  providerId: string
  onClose: () => void
  onAction: () => void
}) {
  const [detail, setDetail] = useState<ProviderDetail | null>(null)
  const [riskSignals, setRiskSignals] = useState<RiskSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/kyc/${providerId}`)
      .then(r => r.json())
      .then(d => {
        setDetail(d.provider)
        setRiskSignals(d.riskSignals || [])
        setAdminNotes(d.provider?.kycRecord?.adminNotes || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [providerId])

  async function saveNotes() {
    if (!detail) return
    if (adminNotes === (detail.kycRecord?.adminNotes || '')) return
    setSaving(true)
    await fetch(`/api/admin/kyc/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_notes', adminNotes }),
    })
    setSaving(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
    onAction()
  }

  async function handleAction(act: string) {
    if (!detail) return
    setSaving(true)
    await fetch(`/api/admin/kyc/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, reason, adminNotes }),
    })
    setSaving(false)
    setAction(null)
    setReason('')
    onAction()
    // Refresh detail
    fetch(`/api/admin/kyc/${providerId}`)
      .then(r => r.json())
      .then(d => { setDetail(d.provider); setRiskSignals(d.riskSignals || []) })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e8e1de] border-t-[#1A1A1A]" />
      </div>
    )
  }

  if (!detail) return null

  const kyc = detail.kycRecord
  const kycStatus = kyc?.status || 'PENDING'
  const isActionable = ['PENDING', 'REQUIRES_ACTION', 'UNDER_REVIEW'].includes(kycStatus)
  const stripeUrl = detail.stripeAccountId
    ? `https://dashboard.stripe.com/connect/accounts/${detail.stripeAccountId}`
    : null

  return (
    <div className="flex h-full flex-col">
      {/* Drawer header */}
      <div className="flex items-start justify-between border-b border-[#e8e1de] px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[#1A1A1A]">{detail.user.name || 'Unnamed'}</h2>
            <KYCBadge status={kycStatus} />
            <RiskBadge level={kyc?.riskLevel || 'LOW'} />
          </div>
          <p className="text-xs text-[#717171] mt-0.5">{detail.user.email} · {detail.suburb || detail.city}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-[#717171] hover:bg-[#f9f2ef] hover:text-[#1A1A1A]">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

        {/* Stripe Connect Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#717171]">Stripe Connect</h3>
            {stripeUrl && (
              <a
                href={stripeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[#f9f2ef] px-2.5 py-1 text-xs font-medium text-[#E96B56] hover:bg-[#f3ece9] transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Stripe Dashboard
              </a>
            )}
          </div>
          <div className="rounded-xl border border-[#e8e1de] bg-[#f9f2ef] p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#717171]">Account</span>
              {detail.stripeAccountId ? (
                <span className="font-mono text-xs text-[#1A1A1A]">{detail.stripeAccountId.slice(0, 14)}…</span>
              ) : (
                <span className="text-red-500 text-xs font-medium">Not connected</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#717171]">Details submitted</span>
              {detail.stripeDetailsSubmitted ? (
                <span className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Yes</span>
              ) : (
                <span className="text-red-500 text-xs font-medium flex items-center gap-1"><XCircle className="h-3 w-3" /> No</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#717171]">Charges</span>
              {kyc?.chargesEnabled ? (
                <span className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Enabled</span>
              ) : (
                <span className="text-red-500 text-xs font-medium flex items-center gap-1"><XCircle className="h-3 w-3" /> Disabled</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#717171]">Payouts</span>
              {kyc?.payoutsEnabled ? (
                <span className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Enabled</span>
              ) : (
                <span className="text-red-500 text-xs font-medium flex items-center gap-1"><XCircle className="h-3 w-3" /> Disabled</span>
              )}
            </div>
            {kyc?.requirementsDue && (kyc.requirementsDue as string[]).length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#e8e1de]">
                <p className="text-xs font-semibold text-amber-700 mb-1.5">Requirements outstanding</p>
                <ul className="space-y-1">
                  {(kyc.requirementsDue as string[]).map((r: string) => (
                    <li key={r} className="flex items-start gap-1.5 text-xs text-[#717171]">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                      <span className="font-mono">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Risk Signals */}
        {riskSignals.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#717171] mb-2">
              Risk Signals ({riskSignals.length})
            </h3>
            <div className="space-y-1.5">
              {riskSignals.map(s => (
                <div key={s.code} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${SIGNAL_SEVERITY[s.severity]}`}>
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {s.label}
                  <span className="ml-auto capitalize opacity-60">{s.severity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Summary */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#717171] mb-2">Profile</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Services', value: detail._count.services },
              { label: 'Bookings', value: detail._count.bookings },
              { label: 'Portfolio', value: detail.portfolio.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-[#e8e1de] bg-white py-3">
                <div className="text-lg font-bold text-[#1A1A1A]">{value}</div>
                <div className="text-xs text-[#717171]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Services */}
        {detail.services.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#717171] mb-2">Services</h3>
            <div className="space-y-1.5">
              {detail.services.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-[#f9f2ef] px-3 py-2">
                  <span className="text-sm text-[#1A1A1A] truncate">{s.title}</span>
                  <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${
                    s.price < 15 || s.price > 2000 ? 'text-amber-600' : 'text-[#1A1A1A]'
                  }`}>
                    ${s.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        {detail.bookings.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#717171] mb-2">Recent bookings</h3>
            <div className="space-y-1.5">
              {detail.bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-lg bg-[#f9f2ef] px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    b.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                    b.status === 'CANCELLED' || b.status === 'CANCELLED_BY_PROVIDER' ? 'bg-red-50 text-red-600' :
                    'bg-[#f3ece9] text-[#717171]'
                  }`}>{b.status}</span>
                  <span className="text-xs text-[#717171]">{new Date(b.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">${b.totalPrice}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio thumbnails */}
        {detail.portfolio.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#717171] mb-2">Portfolio</h3>
            <div className="grid grid-cols-3 gap-2">
              {detail.portfolio.slice(0, 6).map((p, i) => (
                <img
                  key={i}
                  src={p.url}
                  alt={p.caption || ''}
                  className="aspect-square rounded-lg object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {/* Admin Notes — auto-saves on blur */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#717171]">Internal notes</h3>
            {notesSaved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
            {saving && (
              <span className="text-xs text-[#717171]">Saving…</span>
            )}
          </div>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            onBlur={saveNotes}
            rows={3}
            placeholder="Add internal notes (not visible to artist)..."
            className="w-full rounded-lg border border-[#e8e1de] bg-white p-3 text-xs text-[#1A1A1A] placeholder-[#717171] focus:border-[#E96B56] focus:outline-none resize-none"
          />
        </div>

        {/* Rejected reason */}
        {kyc?.rejectedReason && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-600 mb-1">Rejection reason</p>
            <p className="text-xs text-red-700">{kyc.rejectedReason}</p>
          </div>
        )}

        {/* Action reason input (shown when action selected) */}
        {action && ['reject', 'request_info', 'flag'].includes(action) && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">
              {action === 'reject' ? 'Rejection reason (required)' :
               action === 'request_info' ? 'What info is required?' :
               'Flag reason'}
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-amber-200 bg-white p-2.5 text-xs focus:border-amber-400 focus:outline-none resize-none"
              placeholder="Enter reason..."
            />
          </div>
        )}

        {/* External links */}
        <div className="flex items-center gap-4">
          <a
            href={`/providers/${detail.user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#717171] hover:text-[#1A1A1A]"
          >
            <ExternalLink className="h-3 w-3" /> View public profile
          </a>
          {stripeUrl && (
            <a
              href={stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#717171] hover:text-[#E96B56]"
            >
              <ExternalLink className="h-3 w-3" /> Stripe account
            </a>
          )}
        </div>
      </div>

      {/* Action bar */}
      {isActionable && (
        <div className="border-t border-[#e8e1de] p-4 space-y-2">
          {action ? (
            <div className="flex gap-2">
              <button
                onClick={() => { setAction(null); setReason('') }}
                className="flex-1 rounded-lg border border-[#e8e1de] py-2 text-xs font-medium text-[#717171] hover:bg-[#f9f2ef]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(action)}
                disabled={saving || (['reject', 'request_info'].includes(action) && !reason)}
                className="flex-1 rounded-lg bg-[#1A1A1A] py-2 text-xs font-medium text-white hover:bg-[#333] disabled:opacity-50"
              >
                {saving ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Approve KYC
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 py-2.5 text-xs font-semibold text-red-700"
                >
                  <ShieldX className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAction('request_info')}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#e8e1de] bg-white hover:bg-[#f9f2ef] py-2 text-xs font-medium text-[#1A1A1A]"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Request Info
                </button>
                <button
                  onClick={() => setAction('flag')}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#e8e1de] bg-white hover:bg-[#f9f2ef] py-2 text-xs font-medium text-[#1A1A1A]"
                >
                  <Flag className="h-3.5 w-3.5" /> Flag
                </button>
                <button
                  onClick={() => handleAction('recalculate_risk')}
                  disabled={saving}
                  className="flex items-center justify-center gap-1 rounded-lg border border-[#e8e1de] bg-white hover:bg-[#f9f2ef] px-3 py-2 text-xs font-medium text-[#1A1A1A] disabled:opacity-50"
                  title="Recalculate risk"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {kycStatus === 'VERIFIED' && (
        <div className="border-t border-[#e8e1de] px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <ShieldCheck className="h-4 w-4" />
            <span>KYC Verified — artist can accept bookings</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminKYC() {
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})

  const fetchProviders = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (statusFilter) p.set('status', statusFilter)
    if (riskFilter) p.set('risk', riskFilter)
    fetch(`/api/admin/kyc?${p}`)
      .then(r => r.json())
      .then(d => {
        const list: ProviderRow[] = d.providers || []
        setProviders(list)
        if (!statusFilter && !riskFilter && !search) {
          const c: Record<string, number> = {}
          list.forEach(p => {
            const s = p.kycRecord?.status || 'PENDING'
            c[s] = (c[s] || 0) + 1
          })
          setCounts(c)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, statusFilter, riskFilter])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  useEffect(() => {
    fetch('/api/admin/kyc', { method: 'POST' }).catch(() => null)
  }, [])

  const kpiItems = [
    { label: 'Pending Review',  status: 'PENDING',          color: 'text-[#717171]',  bg: 'bg-[#f9f2ef]',  icon: Clock },
    { label: 'Requires Action', status: 'REQUIRES_ACTION',  color: 'text-amber-600',  bg: 'bg-amber-50',   icon: AlertTriangle },
    { label: 'Under Review',    status: 'UNDER_REVIEW',     color: 'text-blue-600',   bg: 'bg-blue-50',    icon: Shield },
    { label: 'Verified',        status: 'VERIFIED',         color: 'text-green-600',  bg: 'bg-green-50',   icon: ShieldCheck },
    { label: 'Rejected',        status: 'REJECTED',         color: 'text-red-600',    bg: 'bg-red-50',     icon: ShieldX },
  ]

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className={`flex-1 min-w-0 transition-all ${selectedId ? 'pr-0' : ''}`}>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-[#717171]" />
            <h1 className="text-2xl font-bold text-[#1A1A1A]">KYC verification</h1>
          </div>
          <p className="text-sm text-[#717171]">Review artist identity, Stripe status, and risk signals before approving bookings</p>
        </div>

        {/* KPI strip */}
        <div className="mb-6 grid grid-cols-5 gap-3">
          {kpiItems.map(k => {
            const Icon = k.icon
            return (
              <button
                key={k.status}
                onClick={() => setStatusFilter(statusFilter === k.status ? '' : k.status)}
                className={`rounded-2xl border text-left p-4 transition-all ${
                  statusFilter === k.status
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white shadow-md'
                    : 'border-[#e8e1de] bg-white hover:border-[#717171]'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl mb-2 ${
                  statusFilter === k.status ? 'bg-white/20' : k.bg
                }`}>
                  <Icon className={`h-4 w-4 ${statusFilter === k.status ? 'text-white' : k.color}`} />
                </div>
                <div className={`text-xl font-bold ${statusFilter === k.status ? 'text-white' : 'text-[#1A1A1A]'}`}>
                  {counts[k.status] ?? 0}
                </div>
                <div className={`text-xs ${statusFilter === k.status ? 'text-[#FDFBF7]/70' : 'text-[#717171]'}`}>
                  {k.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
            <input
              type="text"
              placeholder="Search artist by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#e8e1de] bg-white py-2 pl-10 pr-4 text-sm text-[#1A1A1A] placeholder-[#717171] focus:border-[#E96B56] focus:outline-none"
            />
          </div>
          <div className="flex gap-1">
            {['', 'LOW', 'MEDIUM', 'HIGH'].map(r => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  riskFilter === r
                    ? 'bg-[#1A1A1A] text-white'
                    : `bg-white border border-[#e8e1de] hover:bg-[#f9f2ef] ${
                        r === 'HIGH' ? 'text-red-600' : r === 'MEDIUM' ? 'text-amber-600' : 'text-[#717171]'
                      }`
                }`}
              >
                {r === '' ? 'All Risk' : `${r.charAt(0)}${r.slice(1).toLowerCase()} Risk`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-[#e8e1de] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e1de] bg-[#f9f2ef]/50 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
                <th className="px-5 py-3">Artist</th>
                <th className="px-5 py-3">KYC Status</th>
                <th className="px-5 py-3">Risk</th>
                <th className="px-5 py-3">Stripe</th>
                <th className="px-5 py-3">Services</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9f2ef]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-[#f3ece9]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Shield className="mx-auto mb-2 h-8 w-8 text-[#e8e1de]" />
                    <p className="text-[#717171]">No artists found</p>
                  </td>
                </tr>
              ) : (
                providers.map(p => {
                  const kycStatus = p.kycRecord?.status || 'PENDING'
                  const riskLevel = p.kycRecord?.riskLevel || 'LOW'
                  const isSelected = selectedId === p.id
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(isSelected ? null : p.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-white'
                          : riskLevel === 'HIGH'
                          ? 'bg-red-50/30 hover:bg-red-50/60'
                          : 'hover:bg-[#f9f2ef]/50'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#f3ece9] text-[#717171]'
                          }`}>
                            {(p.user.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className={`font-medium ${isSelected ? 'text-white' : 'text-[#1A1A1A]'}`}>
                              {p.user.name || 'Unnamed'}
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-[#FDFBF7]/60' : 'text-[#717171]'}`}>
                              {p.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <KYCBadge status={kycStatus} />
                      </td>
                      <td className="px-5 py-4">
                        <RiskBadge level={riskLevel} />
                      </td>
                      <td className="px-5 py-4">
                        {p.stripeAccountId ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-xs font-medium ${
                              p.kycRecord?.chargesEnabled ? 'text-green-600' : isSelected ? 'text-[#FDFBF7]/60' : 'text-[#717171]'
                            }`}>
                              {p.kycRecord?.chargesEnabled ? '✓ charges' : '✗ charges'}
                            </span>
                            <span className={`text-xs font-medium ${
                              p.kycRecord?.payoutsEnabled ? 'text-green-600' : isSelected ? 'text-[#FDFBF7]/60' : 'text-[#717171]'
                            }`}>
                              {p.kycRecord?.payoutsEnabled ? '✓ payouts' : '✗ payouts'}
                            </span>
                            {p.stripeDetailsSubmitted && (
                              <span className="text-xs font-medium text-blue-600">✓ details</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-xs ${isSelected ? 'text-[#FDFBF7]/60' : 'text-red-400'}`}>No account</span>
                          </div>
                        )}
                        {p.stripeAccountId && (
                          <a
                            href={`https://dashboard.stripe.com/connect/accounts/${p.stripeAccountId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className={`mt-1 inline-flex items-center gap-0.5 text-[10px] ${
                              isSelected ? 'text-[#E96B56]' : 'text-[#E96B56]'
                            } hover:underline`}
                          >
                            <ExternalLink className="h-2.5 w-2.5" /> Stripe
                          </a>
                        )}
                      </td>
                      <td className={`px-5 py-4 ${isSelected ? 'text-[#FDFBF7]/80' : 'text-[#717171]'}`}>
                        {p._count.services}
                      </td>
                      <td className={`px-5 py-4 text-xs ${isSelected ? 'text-[#FDFBF7]/60' : 'text-[#717171]'}`}>
                        {new Date(p.user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-white rotate-90' : 'text-[#e8e1de]'}`} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side drawer */}
      {selectedId && (
        <div className="ml-4 w-[420px] flex-shrink-0 rounded-2xl border border-[#e8e1de] bg-white shadow-lg overflow-hidden flex flex-col"
          style={{ maxHeight: 'calc(100vh - 80px)', position: 'sticky', top: 24 }}>
          <DetailDrawer
            providerId={selectedId}
            onClose={() => setSelectedId(null)}
            onAction={fetchProviders}
          />
        </div>
      )}
    </div>
  )
}
