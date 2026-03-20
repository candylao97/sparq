'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

interface HeroSearchBarProps {
  centered?: boolean
}

export function HeroSearchBar({ centered = false }: HeroSearchBarProps) {
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

  const handleTrending = (term: string) => {
    setQuery(term)
    // Trigger AI search with the term
    setLoading(true)
    fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: term }),
    })
      .then(r => r.json())
      .then(filters => {
        const params = new URLSearchParams()
        if (filters.query) params.set('query', filters.query)
        if (filters.category) params.set('category', filters.category)
        if (filters.location) params.set('location', filters.location)
        if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString())
        if (filters.date) params.set('date', filters.date)
        router.push(`/search?${params.toString()}`)
      })
      .catch(() => {
        router.push(`/search?query=${encodeURIComponent(term)}`)
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="relative max-w-2xl group w-full mx-auto">
      <form onSubmit={handleSearch}>
        <div className="relative flex items-center bg-white p-2 rounded-full shadow-lg border border-[#1A1A1A]/5 transition-shadow duration-300 focus-within:shadow-xl focus-within:border-[#E96B56]/20">
          {/* Search input with icon */}
          <div className="flex items-center flex-1 px-4">
            <Sparkles className="h-5 w-5 text-[#E96B56] mr-4 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Try &quot;gel nails near me&quot; or &quot;lash lift Saturday&quot;"
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none py-3 text-[#1A1A1A] text-sm md:text-base placeholder:text-[#717171]/50 font-jakarta"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#E96B56] hover:bg-[#a63a29] text-white px-8 py-3 rounded-full font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {/* Trending tags */}
      <div className={`mt-6 flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>
        <span className="text-xs text-[#717171] mr-1 self-center">
          Popular:
        </span>
        {['Gel Nails', 'Lash Lift', 'Classic Extensions', 'Nail Art', 'Russian Volume'].map(term => (
          <button
            key={term}
            type="button"
            onClick={() => handleTrending(term)}
            className="text-xs px-3 py-1.5 rounded-full border border-[#1A1A1A]/10 text-[#1A1A1A] hover:border-[#E96B56] hover:text-[#E96B56] transition-colors bg-white/50"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
