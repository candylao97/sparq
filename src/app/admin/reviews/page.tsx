'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flag, Eye, EyeOff, Star, Search, AlertTriangle, CheckCircle } from 'lucide-react'

type Review = {
  id: string
  rating: number
  text: string | null
  isFlagged: boolean
  isVisible: boolean
  flagReason: string | null
  createdAt: string
  customer: { name: string | null; email: string | null }
  booking: {
    service: { title: string }
    provider: { name: string | null }
  }
}

type LeakageFlag = {
  id: string
  flagType: string
  snippet: string
  resolved: boolean
  createdAt: string
  bookingId: string | null
  messageId: string | null
  reviewId: string | null
  user: { name: string | null; email: string | null }
}

type Tab = 'all' | 'flagged' | 'hidden' | 'leakage'

export default function AdminReviews() {
  const [tab, setTab] = useState<Tab>('all')
  const [reviews, setReviews] = useState<Review[]>([])
  const [flags, setFlags] = useState<LeakageFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchReviews = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab === 'flagged') params.set('flagged', 'true')
    if (tab === 'hidden') params.set('visible', 'false')
    if (search) params.set('search', search)
    fetch(`/api/admin/reviews?${params}`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab, search])

  const fetchFlags = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/leakage-flags')
      .then(r => r.json())
      .then(d => { setFlags(d.flags || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'leakage') {
      fetchFlags()
    } else {
      fetchReviews()
    }
  }, [tab, fetchReviews, fetchFlags])

  async function toggleFlag(id: string, isFlagged: boolean) {
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFlagged: !isFlagged }),
    })
    fetchReviews()
  }

  async function toggleVisibility(id: string, isVisible: boolean) {
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !isVisible }),
    })
    fetchReviews()
  }

  async function resolveFlag(id: string) {
    await fetch('/api/admin/leakage-flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagId: id }),
    })
    fetchFlags()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'flagged', label: 'Flagged' },
    { key: 'hidden', label: 'Hidden' },
    { key: 'leakage', label: 'Leakage Flags' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Reviews & moderation</h1>
        <p className="text-sm text-[#717171]">Moderate reviews and manage contact leakage flags</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[#f0ebe7]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#E96B56] text-[#1A1A1A]'
                : 'border-transparent text-[#717171] hover:text-[#1A1A1A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'leakage' && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#e8e1de] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#E96B56] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Reviews List */}
      {tab !== 'leakage' && (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#f0ebe7] bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-32 rounded bg-[#f3ece9]" />
                  <div className="h-4 w-20 rounded bg-[#f3ece9]" />
                </div>
                <div className="mt-3 h-4 w-full rounded bg-[#f3ece9]" />
                <div className="mt-2 h-4 w-3/4 rounded bg-[#f3ece9]" />
              </div>
            ))
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-[#f0ebe7] bg-white p-12 text-center text-[#717171]">
              No reviews found
            </div>
          ) : (
            reviews.map(r => (
              <div
                key={r.id}
                className={`rounded-2xl border bg-white p-5 transition-colors ${
                  r.isFlagged ? 'border-red-200 bg-red-50/30' : 'border-[#f0ebe7]'
                } ${!r.isVisible ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-[#e8e1de]'
                            }`}
                          />
                        ))}
                      </div>
                      {r.isFlagged && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          FLAGGED
                        </span>
                      )}
                      {!r.isVisible && (
                        <span className="rounded-full bg-[#f3ece9] px-2 py-0.5 text-[10px] font-medium text-[#717171]">
                          HIDDEN
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#1A1A1A]">{r.text || 'No text provided'}</p>

                    {r.flagReason && (
                      <p className="mt-2 text-xs text-red-500">Flag reason: {r.flagReason}</p>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-[#717171]">
                      <span>By: {r.customer.name || r.customer.email}</span>
                      <span>Service: {r.booking.service.title}</span>
                      <span>Provider: {r.booking.provider.name}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFlag(r.id, r.isFlagged)}
                      className={`rounded-lg p-2 transition-colors ${
                        r.isFlagged ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-[#717171] hover:bg-[#f3ece9] hover:text-[#1A1A1A]'
                      }`}
                      title={r.isFlagged ? 'Unflag' : 'Flag'}
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleVisibility(r.id, r.isVisible)}
                      className={`rounded-lg p-2 transition-colors ${
                        !r.isVisible ? 'bg-[#f3ece9] text-[#717171]' : 'text-[#717171] hover:bg-[#f3ece9] hover:text-[#1A1A1A]'
                      }`}
                      title={r.isVisible ? 'Hide' : 'Show'}
                    >
                      {r.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Leakage Flags */}
      {tab === 'leakage' && (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#f0ebe7] bg-white p-5">
                <div className="h-4 w-48 rounded bg-[#f3ece9]" />
                <div className="mt-3 h-4 w-full rounded bg-[#f3ece9]" />
              </div>
            ))
          ) : flags.length === 0 ? (
            <div className="rounded-2xl border border-[#f0ebe7] bg-white p-12 text-center">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="font-semibold text-[#1A1A1A]">No leakage flags</p>
              <p className="text-sm text-[#717171]">No contact information was detected in messages or bookings.</p>
            </div>
          ) : (
            flags.map(f => (
              <div
                key={f.id}
                className={`rounded-2xl border bg-white p-5 ${
                  f.resolved ? 'border-[#f0ebe7] opacity-60' : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${f.resolved ? 'text-[#717171]' : 'text-amber-500'}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${f.resolved ? 'text-[#717171]' : 'text-amber-700'}`}>
                        {f.flagType}
                      </span>
                      {f.resolved && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Resolved
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-mono text-[#1A1A1A] bg-[#f3ece9] px-3 py-1.5 rounded-lg mt-2 inline-block">
                      {f.snippet}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#717171]">
                      <span>User: {f.user?.name || f.user?.email}</span>
                      {f.bookingId && <span>In booking</span>}
                      {f.messageId && <span>In message</span>}
                      {f.reviewId && <span>In review</span>}
                      <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {!f.resolved && (
                    <button
                      onClick={() => resolveFlag(f.id)}
                      className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors flex-shrink-0"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
