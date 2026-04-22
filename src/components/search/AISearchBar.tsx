'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'

const SUGGESTIONS = [
  'Gel manicure this Saturday under $80',
  'Volume lash set near South Yarra',
  'Acrylic full set in Richmond',
  'Lash lift and tint near me',
]

export function AISearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      router.push('/search')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const filters = await res.json()
      const params = new URLSearchParams()
      if (filters.query) params.set('query', filters.query)
      if (filters.category) params.set('category', filters.category)
      if (filters.location) params.set('location', filters.location)
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString())
      if (filters.date) params.set('date', filters.date)
      router.push(`/search?${params.toString()}`)
    } catch {
      router.push(`/search?query=${encodeURIComponent(query)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleSearch}>
        <div className="flex items-center gap-3 rounded-full border border-[#e8e1de] bg-white py-2 pl-6 pr-2 shadow-search transition-all duration-500 hover:shadow-search-focus focus-within:shadow-search-focus focus-within:border-[#e8e1de]">
          <Search className="h-4 w-4 flex-shrink-0 text-[#BEBEBE]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Try "gel nails Saturday under $80"'
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-[#1A1A1A] placeholder:text-[#BEBEBE] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] h-10 w-10 text-white transition-all duration-300 hover:bg-[#333] disabled:opacity-50 active:scale-[0.95]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {/* Suggestion chips */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuery(s)
              router.push(`/search?query=${encodeURIComponent(s)}`)
            }}
            className="rounded-full border border-[#e8e1de] bg-white px-3.5 py-1.5 text-[12px] text-[#717171] transition-all duration-300 hover:border-[#e8e1de] hover:text-[#717171]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
