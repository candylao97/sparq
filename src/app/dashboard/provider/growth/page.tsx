'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, Users, DollarSign, BarChart2,
  Lightbulb, ImageIcon, Mail, ChevronRight, Plus,
  Instagram, FileText, RefreshCw, MousePointerClick,
  AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiValue {
  value: number
  prevValue: number
}

interface GrowthData {
  kpis: {
    profileViews: KpiValue
    newClients: KpiValue
    revenue: KpiValue
    avgBookingValue: KpiValue
    repeatRate: KpiValue
  }
  recentBookings: Array<{ date: string; revenue: number; bookingCount: number }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDelta(value: number, prevValue: number): { delta: string; positive: boolean } {
  const pct = Math.round(((value - prevValue) / Math.max(prevValue, 1)) * 100)
  return { delta: `${Math.abs(pct)}%`, positive: value >= prevValue }
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function fmtCurrencyDecimal(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  positive,
  icon: Icon,
}: {
  label: string
  value: string
  delta: string
  positive: boolean
  icon: React.ElementType
}) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#717171]">{label}</span>
        <div className="h-8 w-8 rounded-xl bg-[#FAEEED] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#E96B56]" />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#1A1A1A] font-headline leading-none">{value}</p>
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${
          positive
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-red-50 text-red-500'
        }`}
      >
        {positive ? '↑' : '↓'} {delta} vs last month
      </span>
    </div>
  )
}

// ─── KPI Skeleton ─────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex-1 min-w-[180px] animate-pulse h-28 bg-[#f9f2ef] rounded-2xl" />
      ))}
    </>
  )
}

// ─── Revenue Sparkline ────────────────────────────────────────────────────────

function RevenueSparkline({ data }: { data: GrowthData['recentBookings'] }) {
  const last14 = data.slice(-14)
  if (last14.length === 0) {
    return (
      <p className="text-xs text-[#717171] py-4 text-center">No completed bookings in the last 14 days.</p>
    )
  }

  const maxRevenue = Math.max(...last14.map((d) => d.revenue), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5 h-[60px] overflow-x-auto">
        {last14.map((d) => {
          const heightPct = (d.revenue / maxRevenue) * 100
          const heightPx = Math.max(Math.round((heightPct / 100) * 60), 4)
          return (
            <div
              key={d.date}
              title={`${d.date}: ${fmtCurrency(d.revenue)} (${d.bookingCount} booking${d.bookingCount !== 1 ? 's' : ''})`}
              className="flex-1 min-w-[8px] bg-[#E96B56] opacity-70 hover:opacity-100 transition-opacity rounded-sm cursor-default"
              style={{ height: `${heightPx}px` }}
            />
          )
        })}
      </div>
      <p className="text-[11px] text-[#717171] font-medium">Revenue — last 14 days</p>
    </div>
  )
}

// ─── Expert Tip Card ─────────────────────────────────────────────────────────

function ExpertTipCard() {
  return (
    <div className="bg-[#E96B56] rounded-2xl p-5 flex flex-col gap-2 shadow-sm min-w-[220px] max-w-xs">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-white/80" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Expert Tip</span>
      </div>
      <p className="text-white font-bold text-sm leading-snug">
        Artists who respond within 2 hours get 3× more repeat bookings.
      </p>
      <button className="mt-1 text-xs font-semibold text-white/80 underline underline-offset-2 text-left hover:text-white transition-colors">
        See playbook →
      </button>
    </div>
  )
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({
  title,
  badge,
  image,
  redemptions,
  revenue,
  reach,
}: {
  title: string
  badge: 'Active' | 'Draft'
  image: string
  redemptions: string
  revenue: string
  reach: string
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col group">
      <div className="relative h-36 overflow-hidden bg-[#f3ece9]">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        />
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
            badge === 'Active'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-[#f9f2ef] text-[#717171]'
          }`}
        >
          {badge}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <p className="font-bold text-[#1A1A1A] text-sm leading-snug">{title}</p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Redemptions', value: redemptions },
            { label: 'Revenue', value: revenue },
            { label: 'Reach', value: reach },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#717171]">{s.label}</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button className="flex-1 text-xs font-bold text-[#E96B56] border border-[#E96B56] rounded-lg py-1.5 hover:bg-[#FAEEED] transition-colors">
            Edit
          </button>
          <a href="/dashboard/provider/featured" className="flex-1 text-center text-xs font-bold text-white bg-[#E96B56] rounded-lg py-1.5 hover:bg-[#a63a29] transition-colors">
            Boost
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Social Feed Tile ─────────────────────────────────────────────────────────

function SocialTile({ image, likes }: { image: string; likes: string }) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f3ece9] group cursor-pointer">
      <img src={image} alt="Post" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-white text-xs font-bold">
          <Instagram className="h-3.5 w-3.5" /> {likes}
        </div>
      </div>
    </div>
  )
}

function AddTile() {
  return (
    <div className="aspect-square rounded-xl border-2 border-dashed border-[#e8e1de] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#E96B56] hover:bg-[#FAEEED] transition-all group">
      <Plus className="h-5 w-5 text-[#717171] group-hover:text-[#E96B56] transition-colors" />
      <span className="text-[11px] font-semibold text-[#717171] group-hover:text-[#E96B56] transition-colors">Schedule</span>
    </div>
  )
}

// ─── Email Studio Item ────────────────────────────────────────────────────────

function EmailItem({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  badge?: string
}) {
  return (
    <button className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[#f9f2ef] transition-colors rounded-xl group">
      <div className="h-9 w-9 rounded-xl bg-[#FAEEED] flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-[#E96B56]" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{title}</p>
        <p className="text-xs text-[#717171] truncate">{subtitle}</p>
      </div>
      {badge && (
        <span className="text-[10px] font-bold bg-[#FAEEED] text-[#E96B56] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-[#e8e1de] group-hover:text-[#E96B56] transition-colors flex-shrink-0" />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GrowthPage() {
  const [data, setData] = useState<GrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/provider/growth')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: GrowthData = await res.json()
      setData(json)
    } catch (err) {
      setError('Could not load growth data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ── Derived KPI display values ────────────────────────────────────────────
  const kpiCards = data
    ? [
        {
          label: 'Booking Requests',
          value: data.kpis.profileViews.value.toLocaleString(),
          ...calcDelta(data.kpis.profileViews.value, data.kpis.profileViews.prevValue),
          icon: BarChart2,
        },
        {
          label: 'New Clients',
          value: data.kpis.newClients.value.toLocaleString(),
          ...calcDelta(data.kpis.newClients.value, data.kpis.newClients.prevValue),
          icon: Users,
        },
        {
          label: 'Revenue',
          value: fmtCurrency(data.kpis.revenue.value),
          ...calcDelta(data.kpis.revenue.value, data.kpis.revenue.prevValue),
          icon: DollarSign,
        },
        {
          label: 'Avg Booking Value',
          value: fmtCurrencyDecimal(data.kpis.avgBookingValue.value),
          ...calcDelta(data.kpis.avgBookingValue.value, data.kpis.avgBookingValue.prevValue),
          icon: TrendingUp,
        },
        {
          label: 'Repeat Rate',
          value: `${data.kpis.repeatRate.value}%`,
          ...calcDelta(data.kpis.repeatRate.value, data.kpis.repeatRate.prevValue),
          icon: MousePointerClick,
        },
      ]
    : []

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAEEED]">
      <div className="mx-auto max-w-[1600px] px-6 py-8 space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#E96B56] mb-1">Growth</p>
            <h1 className="text-2xl font-bold font-headline text-[#1A1A1A]">Marketing Performance</h1>
          </div>
          <a href="/dashboard/provider/featured" className="inline-flex items-center gap-1.5 rounded-xl bg-[#E96B56] px-4 py-2 text-sm font-bold text-white hover:bg-[#a63a29] transition-colors">
            <Plus className="h-4 w-4" /> New Campaign
          </a>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold flex-1">{error}</span>
            <button
              onClick={fetchData}
              className="text-xs font-bold text-red-700 underline underline-offset-2 hover:text-red-900 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── KPI strip + Expert tip ── */}
        <div className="flex gap-4 flex-wrap">
          {loading ? (
            <KpiSkeleton />
          ) : (
            kpiCards.map((card) => (
              <KpiCard key={card.label} {...card} />
            ))
          )}
          <ExpertTipCard />
        </div>

        {/* ── Revenue sparkline ── */}
        {!loading && data && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1A1A1A]">Revenue Trend</h2>
              <span className="text-xs text-[#717171]">Completed bookings</span>
            </div>
            <RevenueSparkline data={data.recentBookings} />
          </div>
        )}

        {/* ── Bottom grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Promotional Campaigns ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1A1A1A]">Promotional Campaigns</h2>
              <button className="text-xs font-semibold text-[#E96B56] hover:underline">View all</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampaignCard
                title="Summer Glow Package — Nails + Lashes Bundle"
                badge="Active"
                image="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80"
                redemptions="142"
                revenue="$4,260"
                reach="8.2k"
              />
              <CampaignCard
                title="First Visit Discount — 20% off for new clients"
                badge="Active"
                image="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80"
                redemptions="87"
                revenue="$2,088"
                reach="5.1k"
              />
              <CampaignCard
                title="Referral Rewards — Give $10, Get $10"
                badge="Draft"
                image="https://images.unsplash.com/photo-1487412947147-5cebf100d293?w=400&q=80"
                redemptions="—"
                revenue="—"
                reach="—"
              />
              <CampaignCard
                title="Loyalty Milestone — Free nail art after 5 visits"
                badge="Draft"
                image="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80&sat=-100"
                redemptions="—"
                revenue="—"
                reach="—"
              />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">

            {/* Social Feed */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Social Feed</h2>
                  <p className="text-xs text-[#717171]">Your recent posts</p>
                </div>
                <button className="text-xs font-semibold text-[#E96B56] hover:underline">Connect</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <SocialTile
                  image="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&q=80"
                  likes="284"
                />
                <SocialTile
                  image="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&q=80"
                  likes="190"
                />
                <SocialTile
                  image="https://images.unsplash.com/photo-1487412947147-5cebf100d293?w=200&q=80"
                  likes="312"
                />
                <SocialTile
                  image="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=200&q=80"
                  likes="97"
                />
                <SocialTile
                  image="https://images.unsplash.com/photo-1604655852985-c2f8a34c0e9d?w=200&q=80"
                  likes="441"
                />
                <AddTile />
              </div>
            </div>

            {/* Email Studio */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Email Studio</h2>
                  <p className="text-xs text-[#717171]">Automated client outreach</p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                  2 Active
                </span>
              </div>
              <EmailItem
                icon={Mail}
                title="Monthly Newsletter"
                subtitle="Sent on the 1st · 1,240 subscribers"
                badge="On"
              />
              <EmailItem
                icon={RefreshCw}
                title="Smart Retargeting"
                subtitle="Re-engages lapsed clients after 30 days"
                badge="On"
              />
              <EmailItem
                icon={FileText}
                title="List Health Report"
                subtitle="Check deliverability & unsubscribes"
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
