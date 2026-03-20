'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Tag, Search } from 'lucide-react'

const CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: 'Nails', value: 'NAILS' },
  { label: 'Lashes', value: 'LASHES' },
]

export function ExploreFilters() {
  const router = useRouter()
  const [where, setWhere] = useState('')
  const [when, setWhen] = useState('')
  const [category, setCategory] = useState('')

  function handleSearch() {
    const params = new URLSearchParams()
    if (where) params.set('location', where)
    if (when) params.set('date', when)
    if (category) params.set('category', category)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8e1de]/80 bg-white p-2 shadow-sm sm:flex-row sm:items-center">
      {/* Where */}
      <div className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-3 transition-colors hover:bg-[#f9f2ef]">
        <MapPin className="h-4 w-4 flex-shrink-0 text-[#717171]" />
        <input
          type="text"
          placeholder="Suburb or postcode"
          value={where}
          onChange={e => setWhere(e.target.value)}
          className="w-full bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#717171] focus:outline-none"
        />
      </div>

      <div className="hidden h-8 w-px bg-[#e8e1de] sm:block" />

      {/* When */}
      <div className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-3 transition-colors hover:bg-[#f9f2ef]">
        <Calendar className="h-4 w-4 flex-shrink-0 text-[#717171]" />
        <input
          type="text"
          placeholder="Pick a date"
          value={when}
          onChange={e => setWhen(e.target.value)}
          className="w-full bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#717171] focus:outline-none"
        />
      </div>

      <div className="hidden h-8 w-px bg-[#e8e1de] sm:block" />

      {/* Category */}
      <div className="flex flex-1 items-center gap-2.5 rounded-xl px-4 py-3 transition-colors hover:bg-[#f9f2ef]">
        <Tag className="h-4 w-4 flex-shrink-0 text-[#717171]" />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full appearance-none bg-transparent text-sm text-[#1A1A1A] focus:outline-none [&:invalid]:text-[#717171]"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
      </button>
    </div>
  )
}
