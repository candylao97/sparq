'use client'

import { useState, useEffect } from 'react'
import {
  Star, MessageSquare, CalendarPlus, MoreVertical,
  Sparkles, FileText, ChevronRight, Image, Award, Search,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  service: string
  date: string
  amount: string
}

interface Client {
  id: string
  name: string
  avatar: string | null
  email: string | null
  lastVisit: string
  totalSpent: string
  visits: number
  avgTicket: string
  tier: 'LOYAL' | 'NEW' | 'ACTIVE' | 'VIP'
  since: string
  services: string[]
  notes: string
  history: HistoryItem[]
  loyaltyPoints: number
  photoCount: number
  online: boolean
  averageRating: number | null
}

// ─── API response shape ───────────────────────────────────────────────────────

interface ApiClient {
  id: string
  name: string
  avatar: string | null
  email: string | null
  visits: number
  totalSpent: number
  avgTicket: number
  lastVisitDate: string
  firstVisitDate: string
  services: string[]
  averageRating: number | null
  tier: 'VIP' | 'LOYAL' | 'ACTIVE' | 'NEW'
  history: Array<{
    serviceTitle: string
    date: string
    amount: number
  }>
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatVisitDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })
}

function formatBookingDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function mapApiClient(c: ApiClient): Client {
  return {
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    email: c.email,
    lastVisit: formatVisitDate(c.lastVisitDate),
    totalSpent: `$${c.totalSpent.toFixed(2)}`,
    visits: c.visits,
    avgTicket: `$${c.avgTicket.toFixed(2)}`,
    tier: c.tier,
    since: formatSince(c.firstVisitDate),
    services: c.services,
    notes: '',
    history: c.history.map((h) => ({
      service: h.serviceTitle,
      date: formatBookingDate(h.date),
      amount: `$${h.amount.toFixed(2)}`,
    })),
    loyaltyPoints: c.visits * 50,
    photoCount: 0,
    online: false,
    averageRating: c.averageRating,
  }
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_STYLES: Record<Client['tier'], string> = {
  LOYAL:  'bg-[#FAEEED] text-[#a63a29]',
  NEW:    'bg-[#f3ece9] text-[#717171]',
  ACTIVE: 'bg-[#FFF3E0] text-[#E65100]',
  VIP:    'bg-amber-50 text-amber-700',
}

function TierBadge({ tier }: { tier: Client['tier'] }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  )
}

// ─── Client list item ─────────────────────────────────────────────────────────

function ClientRow({
  client,
  active,
  onClick,
}: {
  client: Client
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
        active
          ? 'bg-white shadow-sm border-l-4 border-[#E96B56] translate-x-1'
          : 'bg-white/60 hover:bg-white hover:translate-x-1 border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          {client.avatar ? (
            <img
              src={client.avatar}
              alt={client.name}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#f3ece9] flex items-center justify-center text-[#E96B56] font-bold text-base">
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}
          {client.online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[#1A1A1A] text-sm truncate">{client.name}</p>
          <p className="text-[11px] text-[#717171]">Last visit: {client.lastVisit}</p>
        </div>
      </div>
      <div className="flex-shrink-0 text-right ml-3">
        <p className="text-sm font-bold text-[#E96B56]">{client.totalSpent}</p>
        <TierBadge tier={client.tier} />
      </div>
    </button>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border-b-2 ${accent}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-2">{label}</p>
      <p className="text-3xl font-bold font-headline text-[#1A1A1A] leading-none">{value}</p>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse h-16 bg-[#f9f2ef] rounded-xl" />
      ))}
    </div>
  )
}

// ─── Error card ───────────────────────────────────────────────────────────────

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
      <p className="text-[#1A1A1A] font-bold mb-1">Could not load clients</p>
      <p className="text-sm text-[#717171] mb-4">Something went wrong. Please try again.</p>
      <button
        onClick={onRetry}
        className="px-5 py-2 bg-[#E96B56] text-white text-sm font-bold rounded-full hover:bg-[#a63a29] transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

// ─── Client detail panel ──────────────────────────────────────────────────────

function ClientDetail({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero card */}
      <div className="bg-white rounded-3xl p-8 relative overflow-hidden shadow-sm">
        {/* Decorative blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FAEEED] rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        {/* Top row */}
        <div className="relative flex items-start justify-between mb-8">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {client.avatar ? (
                <img
                  src={client.avatar}
                  alt={client.name}
                  className="w-32 h-32 rounded-full object-cover shadow-lg ring-4 ring-white"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[#f3ece9] flex items-center justify-center text-[#E96B56] font-bold text-4xl shadow-lg ring-4 ring-white">
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
              {client.online && (
                <span className="absolute bottom-2 right-2 h-5 w-5 bg-emerald-500 rounded-full border-4 border-white" />
              )}
            </div>

            {/* Info */}
            <div>
              <h2 className="text-4xl font-bold font-headline text-[#1A1A1A] tracking-tight mb-1">
                {client.name}
              </h2>
              <p className="text-[#717171] font-medium">
                {client.tier === 'VIP' ? 'VIP Client' : client.tier === 'LOYAL' ? 'Loyal Client' : 'Client'} · Since {client.since}
              </p>
              {client.averageRating !== null && (
                <p className="text-sm text-[#717171] mt-1 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-semibold text-[#1A1A1A]">{client.averageRating.toFixed(1)}</span>
                  <span>avg rating</span>
                </p>
              )}
              <div className="flex gap-3 mt-5">
                <button className="inline-flex items-center gap-2 px-5 py-2 bg-[#E96B56] text-white rounded-full text-sm font-bold hover:bg-[#a63a29] transition-colors shadow-sm">
                  <CalendarPlus className="h-4 w-4" /> Book New Visit
                </button>
                <button className="inline-flex items-center gap-2 px-5 py-2 border-2 border-[#e8e1de] text-[#717171] rounded-full text-sm font-bold hover:bg-[#f9f2ef] transition-colors">
                  <MessageSquare className="h-4 w-4" /> Message
                </button>
              </div>
            </div>
          </div>

          <button className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-[#f9f2ef] transition-colors text-[#717171]">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Spent"  value={client.totalSpent}      accent="border-[#E96B56]/30" />
          <StatCard label="Visits"       value={String(client.visits)}  accent="border-[#D07565]/30" />
          <StatCard label="Avg. Ticket"  value={client.avgTicket}       accent="border-[#f3ece9]" />
        </div>

        {/* Services + Notes / History */}
        <div className="grid grid-cols-2 gap-8">
          {/* Left: services + notes */}
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#E96B56]" /> Preferred Services
            </h3>
            {client.services.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-8">
                {client.services.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1.5 bg-[#FAEEED] text-[#a63a29] rounded-full text-xs font-bold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#717171] mb-8">No services recorded yet.</p>
            )}

            <h3 className="text-base font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#E96B56]" /> Private Notes
            </h3>
            <div className="bg-[#f9f2ef] border-l-4 border-[#e8e1de] rounded-xl p-4">
              {client.notes ? (
                <p className="text-sm text-[#717171] leading-relaxed italic">
                  &ldquo;{client.notes}&rdquo;
                </p>
              ) : (
                <p className="text-sm text-[#717171] italic">No notes yet.</p>
              )}
            </div>
          </div>

          {/* Right: recent history */}
          <div className="bg-[#f9f2ef] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#1A1A1A]">Recent History</h3>
              <button className="text-xs font-semibold text-[#E96B56] hover:underline">View All</button>
            </div>
            {client.history.length === 0 ? (
              <p className="text-sm text-[#717171]">No history yet.</p>
            ) : (
              <div className="space-y-5">
                {client.history.map((h, i) => (
                  <div key={i} className={`flex gap-4 ${i > 0 ? 'opacity-60' : ''}`}>
                    <div className={`w-1 rounded-full flex-shrink-0 ${i === 0 ? 'bg-[#E96B56]' : 'bg-[#e8e1de]'}`} />
                    <div>
                      <p className="font-bold text-[#1A1A1A] text-sm">{h.service}</p>
                      <p className="text-xs text-[#717171]">{h.date}</p>
                      <p className={`text-sm font-bold mt-0.5 ${i === 0 ? 'text-[#E96B56]' : 'text-[#717171]'}`}>
                        {h.amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-2 gap-5">
        {/* Loyalty Rewards */}
        <button className="group bg-white rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md hover:bg-[#FAEEED] transition-all text-left">
          <div className="h-14 w-14 bg-[#FAEEED] group-hover:bg-white rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:scale-110 duration-200">
            <Award className="h-7 w-7 text-[#E96B56]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1A1A1A]">Loyalty Rewards</p>
            <p className="text-sm text-[#717171]">
              {client.loyaltyPoints.toLocaleString()} pts · Next reward at 1,000
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-[#e8e1de] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E96B56] rounded-full transition-all"
                style={{ width: `${Math.min((client.loyaltyPoints / 1000) * 100, 100)}%` }}
              />
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#717171] flex-shrink-0 group-hover:text-[#E96B56] transition-colors" />
        </button>

        {/* Visual Archive */}
        <button className="group bg-white rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md hover:bg-[#f9f2ef] transition-all text-left">
          <div className="h-14 w-14 bg-[#f9f2ef] group-hover:bg-white rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:scale-110 duration-200">
            <Image className="h-7 w-7 text-[#D07565]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1A1A1A]">Visual Archive</p>
            <p className="text-sm text-[#717171]">
              {client.photoCount} progress photos from previous sessions
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#717171] flex-shrink-0 group-hover:text-[#E96B56] transition-colors" />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<Client['tier'] | 'ALL'>('ALL')

  async function fetchClients() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/provider/clients')
      if (!res.ok) throw new Error('Failed')
      const data: { clients: ApiClient[]; total: number } = await res.json()
      const mapped = data.clients.map(mapApiClient)
      setClients(mapped)
      if (mapped.length > 0) setSelected(mapped[0])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filtered = clients.filter((c) => {
    const matchSearch =
      search.trim() === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchTier = tierFilter === 'ALL' || c.tier === tierFilter
    return matchSearch && matchTier
  })

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAEEED]">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-160px)]">

          {/* ── Client list ── */}
          <div className="col-span-4 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#E96B56] mb-0.5">CRM</p>
                <h1 className="text-2xl font-bold font-headline text-[#1A1A1A]">Clients</h1>
              </div>
              <span className="text-sm text-[#717171] font-medium">
                {loading ? '—' : `${clients.length} active`}
              </span>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm">
              <Search className="h-4 w-4 text-[#717171] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-[#717171]/50 text-[#1A1A1A]"
              />
            </div>

            {/* Tier filter */}
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'VIP', 'LOYAL', 'ACTIVE', 'NEW'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition-colors ${
                    tierFilter === t
                      ? 'bg-[#E96B56] text-white'
                      : 'bg-white text-[#717171] hover:bg-[#f9f2ef]'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-2 overflow-y-auto flex-1">
              {loading && <LoadingSkeleton />}
              {!loading && error && <ErrorCard onRetry={fetchClients} />}
              {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-12 text-[#717171] text-sm">
                  No clients found.
                </div>
              )}
              {!loading && !error && filtered.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  active={selected?.id === c.id}
                  onClick={() => setSelected(c)}
                />
              ))}
            </div>
          </div>

          {/* ── Client detail ── */}
          <div className="col-span-8">
            {loading && (
              <div className="space-y-4">
                <div className="animate-pulse h-96 bg-[#f9f2ef] rounded-3xl" />
                <div className="animate-pulse h-24 bg-[#f9f2ef] rounded-2xl" />
              </div>
            )}
            {!loading && error && (
              <div className="flex items-center justify-center h-64">
                <ErrorCard onRetry={fetchClients} />
              </div>
            )}
            {!loading && !error && selected && (
              <ClientDetail client={selected} />
            )}
            {!loading && !error && !selected && clients.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-[#1A1A1A] font-bold text-lg mb-2">No clients yet</p>
                <p className="text-sm text-[#717171]">
                  Your clients will appear here once you complete your first booking.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
