'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flag, Eye, EyeOff, Star, Search } from 'lucide-react'

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

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchReviews = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter === 'flagged') params.set('flagged', 'true')
    if (filter === 'hidden') params.set('visible', 'false')
    if (search) params.set('search', search)
    fetch(`/api/admin/reviews?${params}`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter, search])

  useEffect(() => { fetchReviews() }, [fetchReviews])

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500">Moderate and manage customer reviews</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none"
          />
        </div>
        {['all', 'flagged', 'hidden'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-5 w-32 rounded bg-gray-100" />
                <div className="h-4 w-20 rounded bg-gray-100" />
              </div>
              <div className="mt-3 h-4 w-full rounded bg-gray-100" />
              <div className="mt-2 h-4 w-3/4 rounded bg-gray-100" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
            No reviews found
          </div>
        ) : (
          reviews.map(r => (
            <div
              key={r.id}
              className={`rounded-2xl border bg-white p-5 transition-colors ${
                r.isFlagged ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
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
                            i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
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
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        HIDDEN
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-700">{r.text || 'No text provided'}</p>

                  {r.flagReason && (
                    <p className="mt-2 text-xs text-red-500">Flag reason: {r.flagReason}</p>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
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
                      r.isFlagged ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    title={r.isFlagged ? 'Unflag' : 'Flag'}
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleVisibility(r.id, r.isVisible)}
                    className={`rounded-lg p-2 transition-colors ${
                      !r.isVisible ? 'bg-gray-100 text-gray-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
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
    </div>
  )
}
