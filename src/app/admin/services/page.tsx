'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Briefcase, EyeOff, Eye, AlertTriangle, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Service = {
  id: string
  title: string
  category: string
  description: string | null
  price: number
  duration: number
  isActive: boolean
  createdAt: string
  provider: {
    id: string
    userId: string
    suburb: string | null
    city: string
    user: { id: string; name: string | null; email: string | null }
  }
  _count: { bookings: number }
}

const CATEGORY_BADGE: Record<string, string> = {
  NAILS: 'bg-pink-50 text-pink-700',
  LASHES: 'bg-purple-50 text-purple-700',
  MAKEUP: 'bg-rose-50 text-rose-700',
}

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ service: Service; active: boolean } | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchServices = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (category) p.set('category', category)
    if (activeFilter !== '') p.set('active', activeFilter)
    fetch(`/api/admin/services?${p}`)
      .then(r => r.json())
      .then(d => { setServices(d.services || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, category, activeFilter])

  useEffect(() => { fetchServices() }, [fetchServices])

  async function handleToggle() {
    if (!confirmModal) return
    setSaving(true)
    await fetch(`/api/admin/services/${confirmModal.service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: confirmModal.active, reason }),
    })
    setSaving(false)
    setConfirmModal(null)
    setReason('')
    fetchServices()
  }

  // Detect pricing anomalies (price < $20 or > $2000)
  const isPriceAnomaly = (price: number) => price < 20 || price > 2000

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Service moderation</h1>
        <p className="text-sm text-[#717171]">Review and moderate artist service listings</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
          <input
            type="text"
            placeholder="Search services or artists..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#e8e1de] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#717171] focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-lg border border-[#e8e1de] bg-white py-2 px-3 text-sm focus:border-[#717171] focus:outline-none"
        >
          <option value="">All Categories</option>
          <option value="NAILS">Nails</option>
          <option value="LASHES">Lashes</option>
          <option value="MAKEUP">Makeup</option>
        </select>
        {[
          { value: '', label: 'All' },
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Hidden' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === f.value ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#717171] border border-[#e8e1de] hover:bg-[#f9f2ef]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e8e1de] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e1de] bg-[#f9f2ef]/50 text-left text-xs font-medium uppercase tracking-wider text-[#717171]">
              <th className="px-5 py-3">Service</th>
              <th className="px-5 py-3">Artist</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Duration</th>
              <th className="px-5 py-3">Bookings</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f9f2ef]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-[#f9f2ef]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <Briefcase className="mx-auto mb-2 h-8 w-8 text-[#D5CEC9]" />
                  <p className="text-[#717171]">No services found</p>
                </td>
              </tr>
            ) : (
              services.map(s => (
                <tr key={s.id} className={`hover:bg-[#f9f2ef]/50 ${!s.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-[#1A1A1A]">{s.title}</div>
                        {s.description && (
                          <div className="text-xs text-[#717171] truncate max-w-[180px]">{s.description}</div>
                        )}
                      </div>
                      {isPriceAnomaly(s.price) && (
                        <span title="Price anomaly">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#1A1A1A]">{s.provider.user.name}</div>
                    <div className="text-xs text-[#717171]">{s.provider.suburb || s.provider.city}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGE[s.category] || 'bg-[#f9f2ef] text-[#717171]'}`}>
                      {s.category}
                    </span>
                  </td>
                  <td className={`px-5 py-4 font-medium ${isPriceAnomaly(s.price) ? 'text-amber-600' : 'text-[#1A1A1A]'}`}>
                    {formatCurrency(s.price)}
                  </td>
                  <td className="px-5 py-4 text-[#717171]">{s.duration}min</td>
                  <td className="px-5 py-4 text-[#717171]">{s._count.bookings}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? 'bg-green-50 text-green-700' : 'bg-[#f9f2ef] text-[#717171]'}`}>
                      {s.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConfirmModal({ service: s, active: !s.isActive })}
                        className={`rounded-lg p-1.5 transition-colors ${
                          s.isActive
                            ? 'text-[#717171] hover:bg-[#f9f2ef] hover:text-[#717171]'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={s.isActive ? 'Hide listing' : 'Restore listing'}
                      >
                        {s.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <a
                        href={`/providers/${s.provider.userId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-[#717171] hover:bg-[#f9f2ef] hover:text-[#717171]"
                        title="View provider profile"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-[#1A1A1A]">
              {confirmModal.active ? 'Restore Listing' : 'Hide Listing'}
            </h3>
            <p className="mb-4 text-sm text-[#717171]">&ldquo;{confirmModal.service.title}&rdquo; by {confirmModal.service.provider.user.name}</p>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                Reason {!confirmModal.active && '(required)'}
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[#e8e1de] p-3 text-sm focus:border-[#717171] focus:outline-none"
                placeholder="Enter reason for this action..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmModal(null); setReason('') }}
                className="rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] hover:bg-[#f9f2ef]"
              >
                Cancel
              </button>
              <button
                onClick={handleToggle}
                disabled={saving || (!confirmModal.active && !reason)}
                className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
