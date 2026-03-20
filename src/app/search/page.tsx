'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProviderCard } from '@/components/providers/ProviderCard'
import { ProviderCardSkeleton } from '@/components/ui/Skeleton'
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar,
  SlidersHorizontal,
  Home,
  Building2,
  X,
  ArrowUpDown,
} from 'lucide-react'
import type { ProviderCardData } from '@/types'

const MELBOURNE_SUBURBS: { suburb: string; postcode: string }[] = [
  { suburb: 'Melbourne CBD', postcode: '3000' },
  { suburb: 'Southbank', postcode: '3006' },
  { suburb: 'South Yarra', postcode: '3141' },
  { suburb: 'Toorak', postcode: '3142' },
  { suburb: 'Richmond', postcode: '3121' },
  { suburb: 'Fitzroy', postcode: '3065' },
  { suburb: 'Collingwood', postcode: '3066' },
  { suburb: 'Carlton', postcode: '3053' },
  { suburb: 'Brunswick', postcode: '3056' },
  { suburb: 'Prahran', postcode: '3181' },
  { suburb: 'St Kilda', postcode: '3182' },
  { suburb: 'Windsor', postcode: '3181' },
  { suburb: 'Hawthorn', postcode: '3122' },
  { suburb: 'Camberwell', postcode: '3124' },
  { suburb: 'Malvern', postcode: '3144' },
  { suburb: 'Armadale', postcode: '3143' },
  { suburb: 'Caulfield', postcode: '3162' },
  { suburb: 'Brighton', postcode: '3186' },
  { suburb: 'Elsternwick', postcode: '3185' },
  { suburb: 'Doncaster', postcode: '3108' },
  { suburb: 'Box Hill', postcode: '3128' },
  { suburb: 'Glen Waverley', postcode: '3150' },
  { suburb: 'Footscray', postcode: '3011' },
  { suburb: 'Williamstown', postcode: '3016' },
  { suburb: 'Northcote', postcode: '3070' },
  { suburb: 'Preston', postcode: '3072' },
  { suburb: 'Thornbury', postcode: '3071' },
  { suburb: 'Coburg', postcode: '3058' },
  { suburb: 'Kew', postcode: '3101' },
  { suburb: 'Balwyn', postcode: '3103' },
  { suburb: 'Albert Park', postcode: '3206' },
  { suburb: 'Middle Park', postcode: '3206' },
  { suburb: 'Port Melbourne', postcode: '3207' },
  { suburb: 'South Melbourne', postcode: '3205' },
  { suburb: 'Cremorne', postcode: '3121' },
  { suburb: 'Abbotsford', postcode: '3067' },
  { suburb: 'Moonee Ponds', postcode: '3039' },
  { suburb: 'Essendon', postcode: '3040' },
  { suburb: 'Bentleigh', postcode: '3204' },
  { suburb: 'Carnegie', postcode: '3163' },
]

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Nails', value: 'NAILS' },
  { label: 'Lashes', value: 'LASHES' },
]

const SORT_OPTIONS = [
  { label: 'Recommended', value: 'score' },
  { label: 'Price: low to high', value: 'price_asc' },
  { label: 'Price: high to low', value: 'price_desc' },
  { label: 'Top rated', value: 'rating' },
]

function HScrollRow({
  title,
  providers,
  loading,
  onSeeAll,
}: {
  title: string
  providers: ProviderCardData[]
  loading: boolean
  onSeeAll: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: 'left' | 'right') =>
    ref.current?.scrollBy({ left: dir === 'left' ? -700 : 700, behavior: 'smooth' })

  return (
    <section className="mb-14">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1.5 font-headline text-xl text-[#1A1A1A] hover:text-[#E96B56] transition-colors"
          >
            {title} <ChevronRight className="w-4 h-4 mt-0.5" />
          </button>
          {!loading && providers.length > 0 && (
            <p className="text-sm text-[#555] mt-1">{providers.length} artist{providers.length !== 1 ? 's' : ''} available</p>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full border border-[#e8e1de] flex items-center justify-center hover:border-[#1A1A1A] transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-[#717171]" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full border border-[#e8e1de] flex items-center justify-center hover:border-[#1A1A1A] transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-[#717171]" />
          </button>
        </div>
      </div>

      <div ref={ref} className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64">
                <ProviderCardSkeleton />
              </div>
            ))
          : providers.length > 0
          ? providers.map(p => (
              <div key={p.id} className="flex-shrink-0 w-64">
                <ProviderCard provider={p} />
              </div>
            ))
          : (
            <div className="py-12 text-center w-full">
              <p className="text-sm text-[#717171]">No artists in this area yet — check back soon.</p>
            </div>
          )}
      </div>
    </section>
  )
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [allProviders, setAllProviders] = useState<ProviderCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState(searchParams.get('location') || '')
  const [locationInput, setLocationInput] = useState(searchParams.get('location') || '')
  const [showSuburbs, setShowSuburbs] = useState(false)
  const [date, setDate] = useState(searchParams.get('date') || '')
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [serviceMode, setServiceMode] = useState<'' | 'AT_HOME' | 'STUDIO'>('')
  const [sortBy, setSortBy] = useState('score')
  const [showFilters, setShowFilters] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const locationRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const hasActiveFilters = priceMin !== '' || priceMax !== '' || serviceMode !== ''
  const activeFilterCount = [priceMin || priceMax ? 1 : 0, serviceMode ? 1 : 0].reduce((a, b) => a + b, 0)

  const clearFilters = () => {
    setPriceMin('')
    setPriceMax('')
    setServiceMode('')
  }

  const isPostcodeInput = /^\d/.test(locationInput.trim())
  const filteredSuburbs = isPostcodeInput
    ? MELBOURNE_SUBURBS.filter(s => s.postcode.startsWith(locationInput.trim()))
    : []

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowSuburbs(false)
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeCategory) params.set('category', activeCategory)
      if (location) params.set('location', location)
      if (priceMin) params.set('minPrice', priceMin)
      if (priceMax) params.set('maxPrice', priceMax)
      if (serviceMode) params.set('serviceMode', serviceMode)
      params.set('sortBy', sortBy)
      const res = await fetch(`/api/providers?${params}`)
      const data = await res.json()
      setAllProviders(data.providers || [])
    } catch {
      setAllProviders([])
    } finally {
      setLoading(false)
    }
  }, [activeCategory, location, priceMin, priceMax, serviceMode, sortBy])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const nailProviders = allProviders.filter(p => p.services.some(s => s.category === 'NAILS'))
  const lashProviders = allProviders.filter(p => p.services.some(s => s.category === 'LASHES'))

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'
  const displayLocation = location || 'Melbourne'

  return (
    <div className="min-h-screen bg-[#FDFBF7]">

      {/* ── Sticky search bar ── */}
      <div className="border-b border-[#1A1A1A]/5 bg-white sticky top-[72px] z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-3 flex justify-center">
          <div className="flex items-stretch rounded-full border border-[#e8e1de] bg-white shadow-sm w-full max-w-2xl hover:shadow-md transition-shadow duration-300">
            {/* Where */}
            <div ref={locationRef} className="relative flex-1 px-5 py-2 border-r border-[#e8e1de] min-w-0">
              <p className="text-[10px] font-semibold text-[#1A1A1A] uppercase tracking-widest mb-0.5">Where</p>
              <input
                value={locationInput}
                onChange={e => {
                  setLocationInput(e.target.value)
                  setShowSuburbs(true)
                }}
                onFocus={() => setShowSuburbs(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setShowSuburbs(false)
                    setLocation(locationInput)
                    fetchProviders()
                  }
                }}
                placeholder="Postcode or suburb"
                className="text-sm text-[#1A1A1A] bg-transparent focus:outline-none w-full placeholder-[#BEBEBE] truncate"
              />
              {showSuburbs && filteredSuburbs.length > 0 && (
                <div className="absolute left-0 top-full mt-2 w-72 max-h-64 overflow-y-auto rounded-2xl border border-[#e8e1de] bg-white py-2 shadow-xl z-50">
                  {filteredSuburbs.map(s => (
                    <button
                      key={`${s.suburb}-${s.postcode}`}
                      type="button"
                      onClick={() => {
                        setLocationInput(`${s.suburb}, ${s.postcode}`)
                        setLocation(s.suburb)
                        setShowSuburbs(false)
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[#f9f2ef] transition-colors"
                    >
                      <span className="text-[#1A1A1A]">{s.suburb}</span>
                      <span className="text-xs text-[#717171]">{s.postcode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="relative flex-1 px-5 py-2 border-r border-[#e8e1de] min-w-0">
              <p className="text-[10px] font-semibold text-[#1A1A1A] uppercase tracking-widest mb-0.5">Date</p>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={date ? new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}
                  placeholder="Any date"
                  onClick={() => {
                    const hidden = document.getElementById('hidden-date-picker') as HTMLInputElement
                    hidden?.showPicker()
                  }}
                  className="text-sm text-[#1A1A1A] bg-transparent focus:outline-none w-full cursor-pointer placeholder-[#BEBEBE]"
                />
                <input
                  id="hidden-date-picker"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="absolute inset-0 opacity-0 pointer-events-none"
                  tabIndex={-1}
                />
                <Calendar className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#BEBEBE]" />
              </div>
            </div>

            {/* Category */}
            <div className="flex-1 px-5 py-2 min-w-0">
              <p className="text-[10px] font-semibold text-[#1A1A1A] uppercase tracking-widest mb-0.5">Category</p>
              <select
                value={activeCategory}
                onChange={e => setActiveCategory(e.target.value)}
                className="text-sm text-[#1A1A1A] bg-transparent focus:outline-none w-full appearance-none cursor-pointer"
              >
                <option value="">All services</option>
                <option value="NAILS">Nails</option>
                <option value="LASHES">Lashes</option>
              </select>
            </div>

            {/* Search button */}
            <button
              onClick={fetchProviders}
              className="m-1.5 bg-[#E96B56] hover:bg-[#d45a45] transition-colors text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter / sort bar ── */}
      <div className="border-b border-[#1A1A1A]/5 bg-white sticky top-[130px] z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-hide">

            {/* Filters button */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold flex-shrink-0 transition-all duration-200 ${
                hasActiveFilters
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                  : 'border-[#e8e1de] text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#1A1A1A]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <span className="w-px h-5 bg-[#e8e1de] flex-shrink-0" />

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 flex-shrink-0 ${
                    activeCategory === cat.value
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-[#717171] hover:text-[#1A1A1A] hover:bg-[#f3ece9]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <span className="w-px h-5 bg-[#e8e1de] flex-shrink-0 hidden md:block" />

            {/* Service mode quick pills */}
            <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setServiceMode(prev => prev === 'AT_HOME' ? '' : 'AT_HOME')}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  serviceMode === 'AT_HOME'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#717171] hover:text-[#1A1A1A] hover:bg-[#f3ece9]'
                }`}
              >
                <Home className="h-3 w-3" /> Comes to you
              </button>
              <button
                onClick={() => setServiceMode(prev => prev === 'STUDIO' ? '' : 'STUDIO')}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  serviceMode === 'STUDIO'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#717171] hover:text-[#1A1A1A] hover:bg-[#f3ece9]'
                }`}
              >
                <Building2 className="h-3 w-3" /> At a studio
              </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Result count */}
            <span className="hidden md:block text-xs text-[#717171] flex-shrink-0 whitespace-nowrap">
              {loading ? 'Loading…' : `${allProviders.length} artist${allProviders.length !== 1 ? 's' : ''}`}
            </span>

            {/* Sort */}
            <div ref={sortRef} className="relative flex-shrink-0">
              <button
                onClick={() => setShowSortMenu(s => !s)}
                className="flex items-center gap-1.5 rounded-full border border-[#e8e1de] px-3.5 py-1.5 text-xs font-semibold text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all duration-200"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{currentSortLabel}</span>
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-[#e8e1de] bg-white shadow-xl py-1.5 z-50">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        sortBy === opt.value
                          ? 'font-semibold text-[#1A1A1A] bg-[#f9f2ef]'
                          : 'text-[#717171] hover:bg-[#f9f2ef] hover:text-[#1A1A1A]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-[#717171] hover:text-[#1A1A1A] transition-colors flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="pb-4 pt-1 border-t border-[#e8e1de]">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {/* Price range */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                    Price range (AUD)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Min"
                      value={priceMin}
                      onChange={e => setPriceMin(e.target.value)}
                      className="w-full rounded-xl border border-[#e8e1de] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#BEBEBE] focus:border-[#1A1A1A] focus:outline-none transition-colors"
                    />
                    <span className="text-xs text-[#717171] flex-shrink-0">to</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Max"
                      value={priceMax}
                      onChange={e => setPriceMax(e.target.value)}
                      className="w-full rounded-xl border border-[#e8e1de] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#BEBEBE] focus:border-[#1A1A1A] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Service mode (mobile) */}
                <div className="md:hidden">
                  <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                    Service mode
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['', 'AT_HOME', 'STUDIO'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setServiceMode(mode)}
                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                          serviceMode === mode
                            ? 'bg-[#1A1A1A] text-white'
                            : 'bg-[#f3ece9] text-[#717171] hover:bg-[#e8e1de]'
                        }`}
                      >
                        {mode === '' && 'All'}
                        {mode === 'AT_HOME' && <><Home className="h-3 w-3" /> Comes to you</>}
                        {mode === 'STUDIO' && <><Building2 className="h-3 w-3" /> At a studio</>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
            {activeCategory === 'NAILS' ? 'Nail artists' : activeCategory === 'LASHES' ? 'Lash artists' : 'Artists'} near {displayLocation}
          </h1>
          <p className="text-base text-[#555] mt-2 leading-relaxed">
            Browse real portfolios, read honest reviews, and book in minutes.
          </p>
        </div>

        {/* Results */}
        {activeCategory ? (
          <section>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
                {Array.from({ length: 8 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
              </div>
            ) : allProviders.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
                {allProviders.map(p => <ProviderCard key={p.id} provider={p} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#f3ece9] flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-[#e8ded9]" />
                </div>
                <p className="font-semibold text-[#1A1A1A] mb-1">No artists found</p>
                <p className="text-sm text-[#717171] max-w-xs">
                  Try a different suburb, remove some filters, or check back soon as more artists join.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm font-semibold text-[#E96B56] hover:text-[#d45a45] transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </section>
        ) : (
          <>
            <HScrollRow
              title="Nail artists"
              providers={nailProviders}
              loading={loading}
              onSeeAll={() => setActiveCategory('NAILS')}
            />
            <HScrollRow
              title="Lash artists"
              providers={lashProviders}
              loading={loading}
              onSeeAll={() => setActiveCategory('LASHES')}
            />
          </>
        )}
      </div>
    </div>
  )
}
