'use client'

import { useEffect, useState } from 'react'
import { Star, StarOff, Search } from 'lucide-react'

interface ProviderRow {
  id: string
  isFeatured: boolean
  featuredUntil: string | null
  user: { name: string | null; email: string | null }
  suburb: string | null
  tier: string
  subscriptionPlan: string
}

export default function FeaturedProvidersPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/providers?limit=200&page=1')
      .then(r => r.json())
      .then(d => { setProviders(d.providers ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleFeatured = async (provider: ProviderRow) => {
    setSaving(provider.id)
    const newFeatured = !provider.isFeatured
    const featuredUntil = newFeatured
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null
    await fetch(`/api/admin/providers/${provider.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFeatured: newFeatured, featuredUntil }),
    })
    setProviders(prev => prev.map(p => p.id === provider.id
      ? { ...p, isFeatured: newFeatured, featuredUntil }
      : p
    ))
    setSaving(null)
  }

  const filtered = providers.filter(p =>
    !search || p.user.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.user.email?.toLowerCase().includes(search.toLowerCase())
  )

  const featuredCount = providers.filter(p => p.isFeatured).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Featured Artists</h1>
        <p className="text-sm text-[#717171] mt-1">
          {featuredCount} artist{featuredCount !== 1 ? 's' : ''} currently featured on the homepage
        </p>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717171]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e8e1de] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#E96B56]"
        />
      </div>

      <div className="rounded-2xl border border-[#e8e1de] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#717171] text-sm">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f9f2ef] border-b border-[#e8e1de]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Artist</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Tier</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A1A]">Featured Until</th>
                <th className="text-right px-4 py-3 font-semibold text-[#1A1A1A]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ece9]">
              {filtered.map(p => (
                <tr key={p.id} className={p.isFeatured ? 'bg-[#fffdf9]' : ''}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1A1A1A]">{p.user.name ?? '—'}</div>
                    <div className="text-xs text-[#717171]">{p.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[#717171]">{p.suburb ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f3ece9] text-[#1A1A1A]">
                      {p.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#717171] text-xs">
                    {p.isFeatured && p.featuredUntil
                      ? new Date(p.featuredUntil).toLocaleDateString('en-AU')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleFeatured(p)}
                      disabled={saving === p.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        p.isFeatured
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          : 'bg-[#f9f2ef] text-[#1A1A1A] border border-[#e8e1de] hover:bg-[#f3ece9]'
                      }`}
                    >
                      {p.isFeatured
                        ? <><StarOff className="h-3.5 w-3.5" /> Unfeature</>
                        : <><Star className="h-3.5 w-3.5" /> Feature</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
