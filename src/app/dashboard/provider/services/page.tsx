'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Sparkles, Eye, Clock,
  Users, MoreHorizontal, Pencil, Power, Trash2,
  ChevronRight, ArrowLeft, Copy, ChevronDown,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceItem {
  id: string
  title: string
  category: string
  description: string | null
  price: number
  duration: number
  locationTypes: string
  maxGuests: number | null
  isActive: boolean
}

interface ServiceAddonItem {
  id: string
  name: string
  price: number
  duration: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// Category-specific gradient for the card "image" area
const CATEGORY_STYLE: Record<string, { from: string; to: string }> = {
  NAILS:   { from: '#fce7e3', to: '#f9d0c9' },
  LASHES:  { from: '#e8e3f9', to: '#d4ccf5' },
  MAKEUP:  { from: '#fdf0ee', to: '#fae4e0' },
  DEFAULT: { from: '#fdf6f4', to: '#f5e8e4' },
}

function CardImageArea({ category, isActive }: { category: string; isActive: boolean }) {
  const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.DEFAULT
  const Icon = category === 'LASHES' ? Eye : Sparkles

  return (
    <div
      className={`relative h-40 w-full flex items-center justify-center transition-opacity ${isActive ? '' : 'opacity-60'}`}
      style={{ background: `linear-gradient(135deg, ${style.from} 0%, ${style.to} 100%)` }}
    >
      <Icon className="h-12 w-12 text-white/60" strokeWidth={1.2} />
      {/* Active / Inactive badge */}
      <span className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isActive ? 'bg-emerald-500 text-white' : 'bg-[#e8e1de] text-[#717171]'
      }`}>
        {isActive ? 'Live' : 'Off'}
      </span>
    </div>
  )
}

// ─── Service Menu (⋯) ────────────────────────────────────────────────────────

function ServiceMenu({
  service,
  onEdit,
  onToggle,
  onDelete,
  onDuplicate,
}: {
  service: ServiceItem
  onEdit: (id: string) => void
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#717171] transition-colors hover:bg-[#f9f2ef] hover:text-[#1A1A1A]"
        aria-label="Service options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-[#f0e8e4] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
            <button
              onClick={() => { onEdit(service.id); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => { onDuplicate(service.id); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button
              onClick={() => { onToggle(service.id, !service.isActive); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
            >
              <Power className="h-3.5 w-3.5" />
              {service.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <div className="mx-4 h-px bg-[#f0e8e4]" />
            <button
              onClick={() => { onDelete(service.id); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Add-ons Panel ───────────────────────────────────────────────────────────

function AddonsPanel({ serviceId }: { serviceId: string }) {
  const [addons, setAddons] = useState<ServiceAddonItem[]>([])
  const [loadingAddons, setLoadingAddons] = useState(true)
  const [newAddonName, setNewAddonName] = useState('')
  const [newAddonPrice, setNewAddonPrice] = useState('')
  const [newAddonDuration, setNewAddonDuration] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch(`/api/services/${serviceId}/addons`)
      .then(r => r.ok ? r.json() : { addons: [] })
      .then(d => setAddons(d.addons ?? []))
      .catch(() => {})
      .finally(() => setLoadingAddons(false))
  }, [serviceId])

  async function addAddon() {
    if (!newAddonName.trim() || !newAddonPrice) return
    setAdding(true)
    try {
      const res = await fetch(`/api/services/${serviceId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAddonName.trim(),
          price: parseFloat(newAddonPrice),
          duration: newAddonDuration ? parseInt(newAddonDuration) : undefined,
        }),
      })
      if (res.ok) {
        const { addon } = await res.json()
        setAddons(prev => [...prev, addon])
        setNewAddonName('')
        setNewAddonPrice('')
        setNewAddonDuration('')
      } else {
        toast.error('Could not add add-on')
      }
    } catch {
      toast.error('Could not add add-on')
    } finally {
      setAdding(false)
    }
  }

  async function deleteAddon(addonId: string) {
    setAddons(prev => prev.filter(a => a.id !== addonId))
    try {
      const res = await fetch(`/api/services/${serviceId}/addons/${addonId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Could not remove add-on')
      // Re-fetch to restore accurate state
      fetch(`/api/services/${serviceId}/addons`)
        .then(r => r.ok ? r.json() : { addons: [] })
        .then(d => setAddons(d.addons ?? []))
        .catch(() => {})
    }
  }

  return (
    <div className="border-t border-[#f3ece9] mt-3 pt-3">
      <p className="text-xs font-semibold text-[#717171] uppercase tracking-wide mb-2">Add-ons</p>
      {loadingAddons ? (
        <div className="h-4 w-20 bg-[#f3ece9] rounded animate-pulse mb-2" />
      ) : addons.length === 0 ? (
        <p className="text-xs text-[#b0a8a4] mb-2">No add-ons yet</p>
      ) : (
        addons.map(addon => (
          <div key={addon.id} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-[#1A1A1A]">{addon.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#717171]">+${addon.price.toFixed(2)}</span>
              <button
                onClick={() => deleteAddon(addon.id)}
                className="text-[#717171] hover:text-red-500 transition-colors"
                aria-label={`Remove ${addon.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
      {/* Add new add-on inline form */}
      <div className="flex gap-2 mt-2">
        <input
          placeholder="e.g. Gel polish"
          value={newAddonName}
          onChange={e => setNewAddonName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addAddon() }}
          className="flex-1 text-sm border border-[#e8e1de] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E96B56]"
        />
        <input
          type="number"
          placeholder="$"
          min="0"
          step="0.01"
          value={newAddonPrice}
          onChange={e => setNewAddonPrice(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addAddon() }}
          className="w-16 text-sm border border-[#e8e1de] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E96B56]"
        />
        <input
          type="number"
          min={5}
          max={120}
          value={newAddonDuration}
          onChange={e => setNewAddonDuration(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addAddon() }}
          placeholder="mins"
          className="w-20 h-9 rounded-lg border border-[#e8e1de] px-2 font-jakarta text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] transition-all"
        />
        <button
          onClick={addAddon}
          disabled={adding || !newAddonName.trim() || !newAddonPrice}
          className="text-xs font-semibold bg-[#E96B56] text-white px-3 py-1.5 rounded-lg hover:bg-[#a63a29] transition-colors disabled:opacity-50"
        >
          {adding ? '…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onEdit,
  onToggle,
  onDelete,
  onDuplicate,
}: {
  service: ServiceItem
  onEdit: (id: string) => void
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const [addonsOpen, setAddonsOpen] = useState(false)

  return (
    <div className={`bg-white border border-[#EFEFEF] overflow-hidden flex flex-col rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
      service.isActive ? '' : 'opacity-70'
    }`}>
      <CardImageArea category={service.category} isActive={service.isActive} />

      <div className="p-4 flex-1 flex flex-col">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-[15px] font-semibold text-[#1A1A1A] leading-snug">
            {service.title}
          </h3>
          <ServiceMenu service={service} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} onDuplicate={onDuplicate} />
        </div>

        {/* Price + duration */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[15px] font-bold text-[#1A1A1A]">
            {formatCurrency(service.price)}
          </span>
          <div className="flex items-center gap-1 text-[#717171]">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[13px]">{formatDuration(service.duration)}</span>
          </div>
          {service.maxGuests && (
            <div className="flex items-center gap-1 text-[#717171]">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[13px]">×{service.maxGuests}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-auto grid grid-cols-3 gap-2">
          <button
            onClick={() => onEdit(service.id)}
            className="flex items-center justify-center gap-1.5 py-2 border border-[#EFEFEF] rounded-xl text-[13px] font-medium text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => onDuplicate(service.id)}
            className="flex items-center justify-center gap-1.5 py-2 border border-[#EFEFEF] rounded-xl text-[13px] font-medium text-[#717171] hover:bg-[#f9f2ef] hover:text-[#1A1A1A] transition-colors"
            title="Duplicate service"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
          <button
            onClick={() => onToggle(service.id, !service.isActive)}
            className={`flex items-center justify-center gap-1.5 py-2 border rounded-xl text-[13px] font-medium transition-colors ${
              service.isActive
                ? 'border-[#EFEFEF] text-[#717171] hover:bg-[#f9f2ef]'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {service.isActive ? 'Off' : 'On'}
          </button>
        </div>

        {/* Add-ons toggle */}
        <button
          onClick={() => setAddonsOpen(p => !p)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${addonsOpen ? 'rotate-180' : ''}`} />
          Add-ons
        </button>

        {addonsOpen && <AddonsPanel serviceId={service.id} />}
      </div>
    </div>
  )
}

// ─── Add Service Card ─────────────────────────────────────────────────────────

function AddServiceCard() {
  return (
    <Link
      href="/dashboard/provider/services/create"
      className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#e8e1de] bg-transparent py-10 text-center transition-colors hover:border-[#E96B56] hover:bg-[#fdf6f4] min-h-[260px]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-[#e8e1de] bg-white transition-colors group-hover:border-[#E96B56]">
        <Plus className="h-5 w-5 text-[#b0a8a4] transition-colors group-hover:text-[#E96B56]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#717171] transition-colors group-hover:text-[#E96B56]">Add a service</p>
        <p className="mt-0.5 text-xs text-[#b0a8a4]">More services = more bookings</p>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role === 'CUSTOMER') {
      router.push('/dashboard/customer')
    }
  }, [status, session, router])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setServices(data.services || [])
    } catch {
      toast.error('Could not load services')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchServices()
  }, [status, fetchServices])

  const handleEdit = (id: string) => router.push(`/dashboard/provider/services/${id}/edit`)

  const handleToggle = async (id: string, active: boolean) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: active } : s))
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: active }),
      })
      if (!res.ok) throw new Error()
      toast.success(active ? 'Service is now live' : 'Service deactivated')
    } catch {
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !active } : s))
      toast.error('Could not update service')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this service? Existing bookings won't be affected.")) return
    setServices(prev => prev.filter(s => s.id !== id))
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Service removed')
    } catch {
      toast.error('Could not remove service')
      fetchServices()
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Service duplicated — it\'s turned off until you publish it', { duration: 5000 })
      fetchServices()
    } catch {
      toast.error('Could not duplicate service')
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const activeCount = services.filter(s => s.isActive).length
  const avgPrice    = services.length ? services.reduce((s, x) => s + x.price, 0) / services.length : 0

  // ── Page ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/dashboard/provider"
            className="flex items-center gap-1.5 text-xs font-medium text-[#717171] hover:text-[#1A1A1A] transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
          <h2 className="text-[22px] font-semibold text-[#1A1A1A]">My Services</h2>
          <p className="text-sm text-[#717171] mt-0.5">
            {services.length === 0
              ? 'Create your first service to start getting bookings'
              : `${activeCount} of ${services.length} service${services.length !== 1 ? 's' : ''} live`}
          </p>
        </div>
        <Link href="/dashboard/provider/services/create">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E96B56] hover:bg-[#d45a45] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Create New Service
          </button>
        </Link>
      </div>

      {/* ── Stats strip ── */}
      {services.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total services', value: String(services.length), color: 'text-[#1A1A1A]' },
            { label: 'Live now',       value: String(activeCount),      color: 'text-emerald-600' },
            { label: 'Avg price',      value: formatCurrency(avgPrice), color: 'text-[#1A1A1A]' },
            { label: 'Avg you earn',   value: formatCurrency(avgPrice * 0.85), color: 'text-[#E96B56]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-[#EFEFEF] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-medium text-[#717171]">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Cards grid ── */}
      {services.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
          <AddServiceCard />
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e8e1de] bg-white py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fdf6f4]">
            <Sparkles className="h-8 w-8 text-[#E96B56]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">No services yet</h2>
          <p className="mt-2 max-w-xs text-sm text-[#717171] leading-relaxed">
            Create your first service listing to appear on the marketplace and start getting bookings.
          </p>
          <Link href="/dashboard/provider/services/create">
            <button className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#E96B56] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#d45a45]">
              <Plus className="h-4 w-4" />
              Create your first service
            </button>
          </Link>
        </div>
      )}

      {/* ── Inactive warning ── */}
      {services.length > 0 && activeCount === 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">None of your services are live</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Activate at least one service so clients can find and book you on the marketplace.
            </p>
          </div>
        </div>
      )}

      {/* ── Portfolio link ── */}
      <div className="mt-8 flex items-center justify-between rounded-2xl border border-[#EFEFEF] bg-white p-5">
        <div>
          <p className="text-sm font-bold text-[#1A1A1A]">Portfolio &amp; Growth Insights</p>
          <p className="mt-0.5 text-xs text-[#717171]">Manage portfolio photos, reply to reviews, and track performance.</p>
        </div>
        <Link
          href="/dashboard/provider/growth"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-[#f9f2ef] px-4 py-2 text-xs font-bold text-[#E96B56] transition-colors hover:bg-[#f0e8e4]"
        >
          View Growth <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  )
}
