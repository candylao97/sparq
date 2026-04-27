'use client'

import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  LayoutGrid,
  Map,
} from 'lucide-react'
import type { ProviderCardData } from '@/types'

// Lazy-load map to avoid SSR issues with Leaflet
const ProviderMapView = lazy(() =>
  import('@/components/providers/ProviderMapView').then(m => ({ default: m.ProviderMapView }))
)

const AU_SUBURBS: { suburb: string; postcode: string }[] = [
  // Sydney
  { suburb: 'Sydney CBD', postcode: '2000' },
  { suburb: 'Bondi', postcode: '2026' },
  { suburb: 'Surry Hills', postcode: '2010' },
  { suburb: 'Newtown', postcode: '2042' },
  { suburb: 'Glebe', postcode: '2037' },
  { suburb: 'Paddington', postcode: '2021' },
  { suburb: 'Double Bay', postcode: '2028' },
  { suburb: 'Mosman', postcode: '2088' },
  { suburb: 'Chatswood', postcode: '2067' },
  { suburb: 'Parramatta', postcode: '2150' },
  { suburb: 'Manly', postcode: '2095' },
  { suburb: 'Coogee', postcode: '2034' },
  { suburb: 'Darlinghurst', postcode: '2010' },
  { suburb: 'Potts Point', postcode: '2011' },
  { suburb: 'Redfern', postcode: '2016' },
  { suburb: 'Balmain', postcode: '2041' },
  { suburb: 'Leichhardt', postcode: '2040' },
  // Melbourne
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
  { suburb: 'Northcote', postcode: '3070' },
  { suburb: 'Caulfield', postcode: '3162' },
  { suburb: 'Brighton', postcode: '3186' },
  { suburb: 'Elsternwick', postcode: '3185' },
  { suburb: 'Doncaster', postcode: '3108' },
  { suburb: 'Box Hill', postcode: '3128' },
  { suburb: 'Glen Waverley', postcode: '3150' },
  { suburb: 'Footscray', postcode: '3011' },
  { suburb: 'Williamstown', postcode: '3016' },
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
  // Brisbane
  { suburb: 'Brisbane CBD', postcode: '4000' },
  { suburb: 'South Brisbane', postcode: '4101' },
  { suburb: 'Fortitude Valley', postcode: '4006' },
  { suburb: 'West End', postcode: '4101' },
  { suburb: 'New Farm', postcode: '4005' },
  { suburb: 'Teneriffe', postcode: '4005' },
  { suburb: 'Bulimba', postcode: '4171' },
  { suburb: 'Milton', postcode: '4064' },
  { suburb: 'Toowong', postcode: '4066' },
]

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Nails', value: 'NAILS' },
  { label: 'Lashes', value: 'LASHES' },
  { label: 'Makeup', value: 'MAKEUP' },
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
            <p className="text-sm text-[#717171] mt-1">{providers.length} artist{providers.length !== 1 ? 's' : ''} available</p>
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
              <div key={i} className="flex-shrink-0 w-72">
                <ProviderCardSkeleton />
              </div>
            ))
          : providers.length > 0
          ? providers.map(p => (
              <div key={p.id} className="flex-shrink-0 w-72">
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

function SearchPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [allProviders, setAllProviders] = useState<ProviderCardData[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // P4-1: Read `q` from URL params — hero search bar submits ?q=gel nails
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [location, setLocation] = useState(searchParams.get('location') || '')
  const [locationInput, setLocationInput] = useState(searchParams.get('location') || '')
  const [showSuburbs, setShowSuburbs] = useState(false)
  const [date, setDate] = useState(searchParams.get('date') || '')
  // Silently strip ?category= values that aren't in the kept enum
  // (NAILS, LASHES, MAKEUP). Prevents stale bookmarks / external links to
  // a removed category from throwing on the API enum cast. Logs once so
  // monitoring can surface high volumes of stale URLs.
  const [activeCategory, setActiveCategory] = useState(() => {
    const raw = searchParams.get('category') || ''
    const VALID = new Set(['', 'NAILS', 'LASHES', 'MAKEUP'])
    if (raw && !VALID.has(raw)) {
      console.warn(`[search] invalid category param: ${raw}`)
      return ''
    }
    return raw
  })
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [priceRangeError, setPriceRangeError] = useState<string | null>(null)
  const [serviceMode, setServiceMode] = useState<'' | 'AT_HOME' | 'STUDIO'>('')
  const [timeOfDay, setTimeOfDay] = useState<'' | 'morning' | 'afternoon' | 'evening'>('')
  const [sortBy, setSortBy] = useState('score')
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') ?? '1')))
  const [showFilters, setShowFilters] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem('sparq_search_view') as 'grid' | 'map') || 'grid'
  })
  const locationRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const isFirstFetch = useRef(true)

  // Sync all filter state back to URL so links are shareable and back/forward works
  const syncUrl = useCallback((overrides: {
    q?: string; category?: string; location?: string; date?: string
    sortBy?: string; page?: number
  } = {}) => {
    const q = overrides.q !== undefined ? overrides.q : searchQuery
    const cat = overrides.category !== undefined ? overrides.category : activeCategory
    const loc = overrides.location !== undefined ? overrides.location : location
    const dt = overrides.date !== undefined ? overrides.date : date
    const sort = overrides.sortBy !== undefined ? overrides.sortBy : sortBy
    const pg = overrides.page !== undefined ? overrides.page : page
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (cat) params.set('category', cat)
    if (loc) params.set('location', loc)
    if (dt) params.set('date', dt)
    if (sort && sort !== 'score') params.set('sortBy', sort)
    if (pg > 1) params.set('page', String(pg))
    router.replace(`/search${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [searchQuery, activeCategory, location, date, sortBy, page, router])

  const handleViewModeChange = (mode: 'grid' | 'map') => {
    setViewMode(mode)
    localStorage.setItem('sparq_search_view', mode)
  }

  const hasActiveFilters = priceMin !== '' || priceMax !== '' || serviceMode !== '' || timeOfDay !== ''
  const activeFilterCount = [priceMin || priceMax ? 1 : 0, serviceMode ? 1 : 0, timeOfDay ? 1 : 0].reduce((a, b) => a + b, 0)

  const clearFilters = () => {
    setPriceMin('')
    setPriceMax('')
    setPriceRangeError(null)
    setServiceMode('')
    setTimeOfDay('')
    setPage(1)
  }

  // P4-2: Match suburbs by name OR postcode — not just postcodes
  const trimmedLocationInput = locationInput.trim()
  const filteredSuburbs = trimmedLocationInput.length > 0
    ? AU_SUBURBS.filter(s =>
        s.suburb.toLowerCase().includes(trimmedLocationInput.toLowerCase()) ||
        s.postcode.startsWith(trimmedLocationInput)
      ).slice(0, 8)
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
    if (isFirstFetch.current) {
      isFirstFetch.current = false
      setLoading(true)
    } else {
      setIsRefetching(true)
    }
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (activeCategory) params.set('category', activeCategory)
      if (location) params.set('location', location)
      const priceRangeValid = !(priceMin && priceMax && Number(priceMin) > Number(priceMax))
      if (priceMin && priceRangeValid) params.set('minPrice', priceMin)
      if (priceMax && priceRangeValid) params.set('maxPrice', priceMax)
      if (serviceMode) params.set('serviceMode', serviceMode)
      if (date) params.set('date', date)
      if (timeOfDay) params.set('timeOfDay', timeOfDay)
      // P4-1: Pass free-text query to API for service title / tagline / name search
      if (searchQuery.trim()) params.set('q', searchQuery.trim())
      params.set('sortBy', sortBy)
      params.set('page', String(page))
      params.set('limit', '20')
      const res = await fetch(`/api/providers?${params}`)
      const data = await res.json()
      setAllProviders(data.providers || [])
      setTotal(data.total ?? 0)
      setTotalPages(data.pages ?? 1)
    } catch {
      setFetchError('Search failed. Please try again.')
    } finally {
      setLoading(false)
      setIsRefetching(false)
    }
  }, [activeCategory, location, priceMin, priceMax, serviceMode, date, timeOfDay, sortBy, searchQuery, page])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  // P4-3: Client-side sort for price and rating (API handles featured/createdAt only)
  const sortedProviders = (() => {
    const copy = [...allProviders]
    if (sortBy === 'price_asc') {
      copy.sort((a, b) => (Math.min(...a.services.map(s => s.price), Infinity) || 0) - (Math.min(...b.services.map(s => s.price), Infinity) || 0))
    } else if (sortBy === 'price_desc') {
      copy.sort((a, b) => (Math.min(...b.services.map(s => s.price), Infinity) || 0) - (Math.min(...a.services.map(s => s.price), Infinity) || 0))
    } else if (sortBy === 'rating') {
      copy.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    }
    return copy
  })()

  const nailProviders = sortedProviders.filter(p => p.services.some(s => s.category === 'NAILS'))
  const lashProviders = sortedProviders.filter(p => p.services.some(s => s.category === 'LASHES'))
  // Build per-category rows for the "All" grid view (only categories with results)
  const categoryRows = CATEGORIES.filter(c => c.value !== '').map(cat => ({
    ...cat,
    providers: sortedProviders.filter(p => p.services.some(s => s.category === cat.value)),
  })).filter(row => row.providers.length > 0)

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'
  const displayLocation = location || 'Melbourne'

  return (
    <div className="min-h-screen bg-white">

      {/* ── Sticky search bar ── */}
      <div className="border-b border-[#1A1A1A]/5 bg-white sticky top-[80px] z-30">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20 py-3 flex justify-center">
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
                    setPage(1)
                    syncUrl({ location: locationInput, page: 1 })
                    fetchProviders()
                  }
                  if (e.key === 'Escape') {
                    setLocationInput('')
                    setShowSuburbs(false)
                  }
                }}
                placeholder="Postcode or suburb"
                className="text-sm text-[#1A1A1A] bg-transparent focus:outline-none w-full placeholder-[#BEBEBE] truncate"
              />
              {showSuburbs && filteredSuburbs.length > 0 && (
                <div role="listbox" className="absolute left-0 top-full mt-2 w-72 max-h-64 overflow-y-auto rounded-2xl border border-[#e8e1de] bg-white py-2 shadow-xl z-50">
                  {filteredSuburbs.map(s => (
                    <button
                      key={`${s.suburb}-${s.postcode}`}
                      type="button"
                      role="option"
                      aria-selected={location === s.suburb}
                      onClick={() => {
                        setLocationInput(`${s.suburb}, ${s.postcode}`)
                        setLocation(s.suburb)
                        setShowSuburbs(false)
                        setPage(1)
                        syncUrl({ location: s.suburb, page: 1 })
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
                  onChange={e => {
                    setDate(e.target.value)
                    setPage(1)
                    syncUrl({ date: e.target.value, page: 1 })
                  }}
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
                <option value="MAKEUP">Makeup</option>
              </select>
            </div>

            {/* Search button */}
            <button
              onClick={() => {
                setPage(1)
                syncUrl({ page: 1 })
                fetchProviders()
              }}
              className="m-1.5 bg-[#E96B56] hover:bg-[#d45a45] transition-colors text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter / sort bar ── */}
      <div className="border-b border-[#1A1A1A]/5 bg-white sticky top-[138px] z-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
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
                  onClick={() => {
                    setActiveCategory(cat.value)
                    setPage(1)
                    syncUrl({ category: cat.value, page: 1 })
                  }}
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
                onClick={() => { setServiceMode(prev => prev === 'AT_HOME' ? '' : 'AT_HOME'); setPage(1) }}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  serviceMode === 'AT_HOME'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#717171] hover:text-[#1A1A1A] hover:bg-[#f3ece9]'
                }`}
              >
                <Home className="h-3 w-3" /> Comes to you
              </button>
              <button
                onClick={() => { setServiceMode(prev => prev === 'STUDIO' ? '' : 'STUDIO'); setPage(1) }}
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
            <span className="hidden md:flex items-center gap-2 text-xs text-[#717171] flex-shrink-0 whitespace-nowrap">
              {loading ? 'Loading…' : `${sortedProviders.length} artist${sortedProviders.length !== 1 ? 's' : ''}`}
              {isRefetching && (
                <span className="w-3 h-3 rounded-full border-2 border-[#E96B56] border-t-transparent animate-spin inline-block" />
              )}
            </span>

            {/* Grid / Map toggle — desktop only inline, mobile shown below filter bar */}
            <div className="hidden sm:flex items-center rounded-full border border-[#e8e1de] overflow-hidden flex-shrink-0">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === 'grid' ? 'bg-[#1A1A1A] text-white' : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => handleViewModeChange('map')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === 'map' ? 'bg-[#1A1A1A] text-white' : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
                aria-label="Map view"
              >
                <Map className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>

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
                      onClick={() => {
                        setSortBy(opt.value)
                        setPage(1)
                        setShowSortMenu(false)
                        syncUrl({ sortBy: opt.value, page: 1 })
                      }}
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

          {/* UX-12: Mobile-only Grid/Map toggle below filter chips */}
          <div className="flex sm:hidden justify-end mt-2 mb-1">
            <div className="flex items-center rounded-full border border-[#e8e1de] overflow-hidden bg-white">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === 'grid' ? 'bg-[#1A1A1A] text-white' : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grid
              </button>
              <button
                onClick={() => handleViewModeChange('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  viewMode === 'map' ? 'bg-[#1A1A1A] text-white' : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
                aria-label="Map view"
              >
                <Map className="h-3.5 w-3.5" /> Map
              </button>
            </div>
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
                      onChange={e => {
                        const val = e.target.value
                        setPriceMin(val)
                        if (val && priceMax && Number(val) > Number(priceMax)) {
                          setPriceRangeError('Min price must be less than max price')
                        } else {
                          setPriceRangeError(null)
                        }
                      }}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#BEBEBE] focus:outline-none transition-colors ${priceRangeError ? 'border-red-400 focus:border-red-500' : 'border-[#e8e1de] focus:border-[#1A1A1A]'}`}
                    />
                    <span className="text-xs text-[#717171] flex-shrink-0">to</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Max"
                      value={priceMax}
                      onChange={e => {
                        const val = e.target.value
                        setPriceMax(val)
                        if (priceMin && val && Number(priceMin) > Number(val)) {
                          setPriceRangeError('Min price must be less than max price')
                        } else {
                          setPriceRangeError(null)
                        }
                      }}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#BEBEBE] focus:outline-none transition-colors ${priceRangeError ? 'border-red-400 focus:border-red-500' : 'border-[#e8e1de] focus:border-[#1A1A1A]'}`}
                    />
                  </div>
                  {priceRangeError && (
                    <p className="mt-1.5 text-xs text-red-500">{priceRangeError}</p>
                  )}
                </div>

                {/* Time of day */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                    Time of day
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      { label: 'Any time', value: '' },
                      { label: '☀️ Morning', value: 'morning', hint: 'before noon' },
                      { label: '🌤 Afternoon', value: 'afternoon', hint: '12–5 pm' },
                      { label: '🌙 Evening', value: 'evening', hint: 'after 5 pm' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setTimeOfDay(opt.value); setPage(1) }}
                        title={'hint' in opt ? opt.hint : undefined}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                          timeOfDay === opt.value
                            ? 'bg-[#1A1A1A] text-white'
                            : 'bg-[#f3ece9] text-[#717171] hover:bg-[#e8e1de] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
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
                        onClick={() => { setServiceMode(mode); setPage(1) }}
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
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">

        {/* Error state */}
        {fetchError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f9f2ef] flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-[#E96B56]" />
            </div>
            <p className="font-semibold text-[#1A1A1A] mb-1">{fetchError}</p>
            <button
              onClick={() => { setFetchError(null); fetchProviders() }}
              className="mt-4 bg-[#E96B56] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#a63a29] transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
            {searchQuery.trim()
              ? <>Results for &ldquo;{searchQuery}&rdquo;</>
              : <>{activeCategory ? `${CATEGORIES.find(c => c.value === activeCategory)?.label ?? activeCategory} artists` : 'Artists'} near {displayLocation}</>
            }
          </h1>
          <p className="text-base text-[#717171] mt-2 leading-relaxed">
            {searchQuery.trim()
              ? 'Artists matching your search — filter by location, date, or price.'
              : 'Browse real portfolios, read honest reviews, and book in minutes.'
            }
          </p>
          {/* Clear search query chip */}
          {searchQuery.trim() && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[#f3ece9] text-[#1A1A1A] text-xs font-semibold px-3 py-1.5 rounded-full">
                &ldquo;{searchQuery}&rdquo;
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setPage(1)
                    syncUrl({ q: '', page: 1 })
                  }}
                  className="text-[#717171] hover:text-[#1A1A1A] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* UX-05: Result count (mobile — desktop count is in filter bar) */}
        {!loading && !fetchError && viewMode === 'grid' && (
          <p className="text-sm text-[#717171] mb-5 md:hidden">
            {sortedProviders.length === 0
              ? 'No artists found — try adjusting your filters'
              : `Showing ${sortedProviders.length} artist${sortedProviders.length === 1 ? '' : 's'}`}
          </p>
        )}

        {/* M12: Map view — shown when viewMode === 'map' */}
        {viewMode === 'map' && !loading && (
          <div className={isRefetching ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
            <Suspense fallback={<div className="rounded-2xl bg-[#f3ece9] h-[600px] flex items-center justify-center"><p className="text-sm text-[#717171]">Loading map…</p></div>}>
              <ProviderMapView key={sortedProviders.map(p => p.id).join(',')} providers={sortedProviders} />
            </Suspense>
          </div>
        )}

        {/* Results grid — hidden in map mode */}
        {viewMode === 'grid' && !fetchError && activeCategory ? (
          <section className={isRefetching ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
            {!loading && sortedProviders.length > 0 && (
              <p className="text-sm text-[#717171] mb-5 hidden md:block">
                Showing {sortedProviders.length} artist{sortedProviders.length === 1 ? '' : 's'}
              </p>
            )}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-10">
                {Array.from({ length: 8 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
              </div>
            ) : sortedProviders.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-10">
                {sortedProviders.map(p => <ProviderCard key={p.id} provider={p} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#f3ece9] flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-[#e8ded9]" />
                </div>
                <p className="font-semibold text-[#1A1A1A] mb-1">No artists found</p>
                <p className="text-sm text-[#717171] max-w-xs mb-5">
                  Try widening your search by removing one of the active filters below.
                </p>
                {/* UX-H3: Specific filter removal chips */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {activeCategory && (
                    <button
                      onClick={() => { setActiveCategory(''); setPage(1); syncUrl({ category: '', page: 1 }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3ece9] text-[#1A1A1A] text-xs font-semibold hover:bg-[#e8d9d4] transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove category
                    </button>
                  )}
                  {date && (
                    <button
                      onClick={() => { setDate(''); setPage(1); syncUrl({ date: '', page: 1 }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3ece9] text-[#1A1A1A] text-xs font-semibold hover:bg-[#e8d9d4] transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove date filter
                    </button>
                  )}
                  {timeOfDay && (
                    <button
                      onClick={() => { setTimeOfDay(''); setPage(1) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3ece9] text-[#1A1A1A] text-xs font-semibold hover:bg-[#e8d9d4] transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove time filter
                    </button>
                  )}
                  {serviceMode && (
                    <button
                      onClick={() => { setServiceMode(''); setPage(1) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3ece9] text-[#1A1A1A] text-xs font-semibold hover:bg-[#e8d9d4] transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove location type
                    </button>
                  )}
                  {(priceMin || priceMax) && (
                    <button
                      onClick={() => { setPriceMin(''); setPriceMax(''); setPage(1) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3ece9] text-[#1A1A1A] text-xs font-semibold hover:bg-[#e8d9d4] transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove price filter
                    </button>
                  )}
                  {location && (
                    <button
                      onClick={() => { setLocation(''); setLocationInput(''); setPage(1); syncUrl({ location: '', page: 1 }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3ece9] text-[#1A1A1A] text-xs font-semibold hover:bg-[#e8d9d4] transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove suburb filter
                    </button>
                  )}
                  {(hasActiveFilters || activeCategory || date || timeOfDay || serviceMode || location) && (
                    <button
                      onClick={() => { clearFilters(); setActiveCategory(''); setDate(''); setLocation(''); setLocationInput(''); syncUrl({ q: searchQuery, category: '', location: '', date: '', page: 1 }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e8e1de] text-[#717171] text-xs font-semibold hover:text-[#1A1A1A] transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : viewMode === 'grid' && !fetchError ? (
          <div className={isRefetching ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
            {loading ? (
              <>
                <HScrollRow title="Loading…" providers={[]} loading={true} onSeeAll={() => {}} />
                <HScrollRow title="Loading…" providers={[]} loading={true} onSeeAll={() => {}} />
              </>
            ) : categoryRows.length > 0 ? categoryRows.map(row => (
              <HScrollRow
                key={row.value}
                title={`${row.label} artists`}
                providers={row.providers}
                loading={false}
                onSeeAll={() => {
                  setActiveCategory(row.value)
                  setPage(1)
                  syncUrl({ category: row.value, page: 1 })
                }}
              />
            )) : (
              <div className="py-24 text-center text-[#717171]">
                <p className="text-lg font-medium text-[#1A1A1A] mb-2">No artists found</p>
                <p className="text-sm">Try adjusting your location or filters</p>
              </div>
            )}
          </div>
        ) : null}

        {/* ── Pagination ── */}
        {!loading && !fetchError && totalPages > 1 && viewMode === 'grid' && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <p className="text-sm text-[#717171]">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} artist{total !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prev = Math.max(1, page - 1)
                  setPage(prev)
                  syncUrl({ page: prev })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={page <= 1}
                className="flex items-center gap-1.5 rounded-full border border-[#e8e1de] px-4 py-2 text-sm font-semibold text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {/* Page number pills */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...'
                      ? <span key={`ellipsis-${i}`} className="px-1 text-sm text-[#717171]">…</span>
                      : (
                        <button
                          key={p}
                          onClick={() => {
                            setPage(p as number)
                            syncUrl({ page: p as number })
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className={`w-9 h-9 rounded-full text-sm font-semibold transition-all duration-200 ${
                            page === p
                              ? 'bg-[#E96B56] text-white'
                              : 'text-[#717171] hover:bg-[#f3ece9] hover:text-[#1A1A1A]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                  )}
              </div>

              <button
                onClick={() => {
                  const next = Math.min(totalPages, page + 1)
                  setPage(next)
                  syncUrl({ page: next })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={page >= totalPages}
                className="flex items-center gap-1.5 rounded-full border border-[#e8e1de] px-4 py-2 text-sm font-semibold text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  )
}
