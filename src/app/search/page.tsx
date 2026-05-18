'use client'

import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { ProviderCardData } from '@/types'
import {
  Search,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Home,
  Building2,
  X,
  Map,
  Heart,
  Star,
} from 'lucide-react'
import { HomeNav } from '@/components/home/HomeNav'
import { HomeFooter } from '@/components/home/HomeFooter'

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

function minServicePrice(p: ProviderCardData): number | null {
  const prices = p.services.map(s => s.price).filter(n => typeof n === 'number')
  return prices.length ? Math.min(...prices) : null
}

function ArtistCard({ p }: { p: ProviderCardData }) {
  const cat = p.services[0]?.category
  const catLabel = CATEGORIES.find(c => c.value === cat)?.label || 'Beauty'
  const blurb = p.services[0]?.title || ''
  const price = minServicePrice(p)
  const rating = p.averageRating ?? 0
  const img = p.portfolio?.[0]?.url || p.image || null
  return (
    <a href={`/providers/${p.id}`} className="group cursor-pointer">
      <div
        className="relative aspect-square overflow-hidden rounded-2xl border border-sparq-border bg-sparq-surface-warm"
        data-label={catLabel}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.name || 'Artist'} className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-sparq-muted opacity-55">
              <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="8.5" r="0.5" fill="currentColor" />
            </svg>
            <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-sparq-muted">{catLabel} · work</span>
          </span>
        )}
        {p.isVerified && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold">Verified</span>
        )}
        <Heart className="absolute right-2.5 top-2.5 h-5 w-5 text-white/95 drop-shadow" aria-hidden="true" />
      </div>
      <div className="pt-3">
        <div className="flex items-baseline justify-between gap-1.5">
          <span className="text-[15px] font-semibold">{p.name || 'Artist'}</span>
          {rating > 0 && (
            <span className="flex flex-shrink-0 items-center gap-[3px] text-[13px] font-medium tabular-nums">
              <Star className="h-2.5 w-2.5 fill-sparq-ink text-sparq-ink" aria-hidden="true" />
              {rating.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-px text-[13px] text-[#717171]">{catLabel}{blurb ? ` · ${blurb}` : ''}</div>
        {p.suburb && <div className="text-[13px] text-[#717171]">{p.suburb}</div>}
        {price !== null && <div className="mt-1.5 text-[14px] tabular-nums">from <strong className="font-bold">${price}</strong></div>}
      </div>
    </a>
  )
}

function CardSkeleton() {
  return (
    <div>
      <div className="aspect-square animate-pulse rounded-2xl bg-sparq-surface-warm" />
      <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-sparq-surface-warm" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-sparq-surface-warm" />
    </div>
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

  // Per-category counts for the chip row
  const categoryCounts = {
    '': sortedProviders.length,
    NAILS: sortedProviders.filter(p => p.services.some(s => s.category === 'NAILS')).length,
    LASHES: sortedProviders.filter(p => p.services.some(s => s.category === 'LASHES')).length,
    MAKEUP: sortedProviders.filter(p => p.services.some(s => s.category === 'MAKEUP')).length,
  } as Record<string, number>

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'
  const displayLocation = location || 'Melbourne'

  return (
    <div className="min-h-screen bg-white text-sparq-ink">
      <HomeNav />

      {/* ── Sticky compact sub-search + Filters trigger ── */}
      <div className="sticky top-0 z-20 border-b border-sparq-border bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
          <div className="flex items-center gap-2.5 py-3.5">
            {/* Desktop pill */}
            <div className="hidden flex-shrink-0 items-center rounded-full border border-sparq-border bg-white py-1 pl-0 pr-1 lg:flex">
              <div ref={locationRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowSuburbs(s => !s)}
                  className="rounded-full px-[18px] py-2 text-left hover:bg-sparq-surface-warm"
                >
                  <div className="text-[10.5px] font-bold">Location</div>
                  <div className={`mt-px whitespace-nowrap text-[12.5px] ${location ? 'text-sparq-ink' : 'text-[#717171]'}`}>
                    {location || 'Melbourne, VIC'}
                  </div>
                </button>
                {showSuburbs && (
                  <div className="absolute left-2 top-full z-50 mt-2 w-72 rounded-2xl border border-sparq-border bg-white p-2 shadow-xl">
                    <input
                      autoFocus
                      value={locationInput}
                      onChange={e => setLocationInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { setShowSuburbs(false); setLocation(locationInput); setPage(1); syncUrl({ location: locationInput, page: 1 }) }
                        if (e.key === 'Escape') { setLocationInput(''); setShowSuburbs(false) }
                      }}
                      placeholder="Postcode or suburb"
                      className="mb-1 w-full rounded-[10px] border border-sparq-border px-3 py-2 text-sm focus:outline-none focus:border-sparq-ink"
                    />
                    {filteredSuburbs.map(s => (
                      <button
                        key={`${s.suburb}-${s.postcode}`}
                        type="button"
                        onClick={() => { setLocationInput(`${s.suburb}, ${s.postcode}`); setLocation(s.suburb); setShowSuburbs(false); setPage(1); syncUrl({ location: s.suburb, page: 1 }) }}
                        className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-sm hover:bg-sparq-surface-warm"
                      >
                        <span>{s.suburb}</span><span className="text-xs text-[#717171]">{s.postcode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="h-7 w-px bg-sparq-border" aria-hidden="true" />
              <button
                type="button"
                onClick={() => (document.getElementById('hidden-date-picker') as HTMLInputElement)?.showPicker()}
                className="rounded-full px-[18px] py-2 text-left hover:bg-sparq-surface-warm"
              >
                <div className="text-[10.5px] font-bold">Date</div>
                <div className={`mt-px whitespace-nowrap text-[12.5px] ${date ? 'text-sparq-ink' : 'text-[#717171]'}`}>
                  {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Any date'}
                </div>
              </button>
              <span className="h-7 w-px bg-sparq-border" aria-hidden="true" />
              <div className="relative px-[18px] py-2">
                <div className="text-[10.5px] font-bold">Service</div>
                <select
                  value={activeCategory}
                  onChange={e => { setActiveCategory(e.target.value); setPage(1); syncUrl({ category: e.target.value, page: 1 }) }}
                  className="mt-px cursor-pointer appearance-none bg-transparent text-[12.5px] focus:outline-none"
                >
                  <option value="">Any service</option>
                  <option value="NAILS">Nails</option>
                  <option value="LASHES">Lashes</option>
                  <option value="MAKEUP">Makeup</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => { setPage(1); syncUrl({ page: 1 }); fetchProviders() }}
                className="ml-1 flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center self-center rounded-full bg-sparq-coral text-white hover:bg-sparq-coral-dark"
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Mobile compact bar */}
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="flex flex-1 items-center gap-2.5 rounded-full border border-sparq-border bg-white px-4 py-2.5 text-left lg:hidden"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold">
                  {activeCategory ? CATEGORIES.find(c => c.value === activeCategory)?.label : 'Any service'} · {displayLocation}
                </span>
                <span className="block text-[11px] text-[#717171]">{date ? new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Any time'}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(f => !f)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-[10px] border px-3 py-[7px] text-[13px] font-medium ${
                hasActiveFilters ? 'border-sparq-ink bg-sparq-ink text-white' : 'border-sparq-border bg-white hover:border-sparq-ink'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && <span className={hasActiveFilters ? 'font-bold text-white/70' : 'font-semibold text-sparq-coral-dark'}>· {activeFilterCount}</span>}
            </button>

            {/* hidden date input driving the Date cell */}
            <input
              id="hidden-date-picker"
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setPage(1); syncUrl({ date: e.target.value, page: 1 }) }}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* ── Category chips ── */}
      <div className="pb-3">
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
          <div className="flex gap-2 overflow-x-auto pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => { setActiveCategory(cat.value); setPage(1); syncUrl({ category: cat.value, page: 1 }) }}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold ${
                  activeCategory === cat.value
                    ? 'border-sparq-ink bg-sparq-ink text-white'
                    : 'border-sparq-border bg-white text-sparq-body hover:border-sparq-ink hover:text-sparq-ink'
                }`}
              >
                {cat.label}
                <span className={`ml-1.5 tabular-nums ${activeCategory === cat.value ? 'text-white/60' : 'text-sparq-muted'}`}>
                  {categoryCounts[cat.value] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results header ── */}
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="flex items-center justify-end gap-2 py-4 lg:py-[18px]">
          <button
            onClick={() => handleViewModeChange(viewMode === 'map' ? 'grid' : 'map')}
            className="hidden items-center gap-2 rounded-[10px] border border-sparq-border bg-white px-3.5 py-2.5 text-[13px] font-semibold hover:border-sparq-ink lg:flex"
          >
            <Map className="h-3.5 w-3.5" />
            {viewMode === 'map' ? 'Show grid' : 'Show map'}
          </button>
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setShowSortMenu(s => !s)}
              className="flex items-center gap-2 rounded-[10px] border border-sparq-border bg-white px-3.5 py-2.5 text-[13px] font-semibold hover:border-sparq-ink"
            >
              {currentSortLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-sparq-border bg-white py-1.5 shadow-xl">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setPage(1); setShowSortMenu(false); syncUrl({ sortBy: opt.value, page: 1 }) }}
                    className={`block w-full px-4 py-2.5 text-left text-sm ${sortBy === opt.value ? 'bg-sparq-surface-warm font-semibold' : 'text-sparq-body hover:bg-sparq-surface-warm hover:text-sparq-ink'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {(searchQuery.trim() || hasActiveFilters) && (
          <div className="flex flex-wrap items-center gap-2 pb-[18px]">
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-2 rounded-full bg-sparq-coral-light px-3 py-1.5 text-[12.5px] font-semibold text-sparq-coral-dark">
                &ldquo;{searchQuery}&rdquo;
                <button onClick={() => { setSearchQuery(''); setPage(1); syncUrl({ q: '', page: 1 }) }} aria-label="Clear search"><X className="h-3 w-3" /></button>
              </span>
            )}
            {(priceMin || priceMax) && (
              <span className="inline-flex items-center gap-2 rounded-full bg-sparq-coral-light px-3 py-1.5 text-[12.5px] font-semibold text-sparq-coral-dark">
                ${priceMin || '0'}–${priceMax || '∞'}
                <button onClick={() => { setPriceMin(''); setPriceMax(''); setPage(1) }} aria-label="Clear price"><X className="h-3 w-3" /></button>
              </span>
            )}
            {serviceMode && (
              <span className="inline-flex items-center gap-2 rounded-full bg-sparq-coral-light px-3 py-1.5 text-[12.5px] font-semibold text-sparq-coral-dark">
                {serviceMode === 'AT_HOME' ? 'Comes to you' : 'At a studio'}
                <button onClick={() => { setServiceMode(''); setPage(1) }} aria-label="Clear service mode"><X className="h-3 w-3" /></button>
              </span>
            )}
            {timeOfDay && (
              <span className="inline-flex items-center gap-2 rounded-full bg-sparq-coral-light px-3 py-1.5 text-[12.5px] font-semibold text-sparq-coral-dark">
                {timeOfDay}
                <button onClick={() => { setTimeOfDay(''); setPage(1) }} aria-label="Clear time"><X className="h-3 w-3" /></button>
              </span>
            )}
            <button onClick={clearFilters} className="px-2.5 py-1.5 text-[12.5px] text-[#717171] hover:text-sparq-ink">Clear all</button>
          </div>
        )}
      </div>

      {/* ── Expanded filter panel ── */}
      {showFilters && (
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
          <div className="mb-6 grid grid-cols-1 gap-6 rounded-xl border border-sparq-border bg-sparq-cream p-5 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider">Price range (AUD)</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} placeholder="Min" value={priceMin}
                  onChange={e => { const v = e.target.value; setPriceMin(v); setPriceRangeError(v && priceMax && Number(v) > Number(priceMax) ? 'Min must be less than max' : null) }}
                  className={`w-full rounded-[10px] border bg-white px-3 py-2 text-sm focus:outline-none ${priceRangeError ? 'border-red-400' : 'border-sparq-border focus:border-sparq-ink'}`} />
                <span className="flex-shrink-0 text-xs text-[#717171]">to</span>
                <input type="number" min={0} placeholder="Max" value={priceMax}
                  onChange={e => { const v = e.target.value; setPriceMax(v); setPriceRangeError(priceMin && v && Number(priceMin) > Number(v) ? 'Min must be less than max' : null) }}
                  className={`w-full rounded-[10px] border bg-white px-3 py-2 text-sm focus:outline-none ${priceRangeError ? 'border-red-400' : 'border-sparq-border focus:border-sparq-ink'}`} />
              </div>
              {priceRangeError && <p className="mt-1.5 text-xs text-red-500">{priceRangeError}</p>}
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider">Time of day</label>
              <div className="flex flex-wrap gap-1.5">
                {([{ label: 'Any time', value: '' }, { label: 'Morning', value: 'morning' }, { label: 'Afternoon', value: 'afternoon' }, { label: 'Evening', value: 'evening' }] as const).map(opt => (
                  <button key={opt.value} onClick={() => { setTimeOfDay(opt.value); setPage(1) }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${timeOfDay === opt.value ? 'bg-sparq-ink text-white' : 'bg-white border border-sparq-border text-sparq-body hover:border-sparq-ink'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider">Service mode</label>
              <div className="flex flex-wrap gap-1.5">
                {(['', 'AT_HOME', 'STUDIO'] as const).map(mode => (
                  <button key={mode} onClick={() => { setServiceMode(mode); setPage(1) }}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${serviceMode === mode ? 'bg-sparq-ink text-white' : 'bg-white border border-sparq-border text-sparq-body hover:border-sparq-ink'}`}>
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

      {/* ── Results ── */}
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        {fetchError ? (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sparq-coral-light text-sparq-coral-dark"><Search className="h-6 w-6" /></span>
            <p className="mb-1 font-bold">{fetchError}</p>
            <button onClick={() => { setFetchError(null); fetchProviders() }} className="mt-4 rounded-[10px] bg-sparq-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-sparq-coral-dark">Try again</button>
          </div>
        ) : viewMode === 'map' && !loading ? (
          <div className={isRefetching ? 'pointer-events-none opacity-50' : ''}>
            <Suspense fallback={<div className="flex h-[600px] items-center justify-center rounded-2xl bg-sparq-surface-warm"><p className="text-sm text-[#717171]">Loading map…</p></div>}>
              <ProviderMapView key={sortedProviders.map(p => p.id).join(',')} providers={sortedProviders} />
            </Suspense>
          </div>
        ) : (
          <div className={isRefetching ? 'pointer-events-none opacity-50 transition-opacity' : 'transition-opacity'}>
            {loading ? (
              <div className="grid grid-cols-1 gap-x-[18px] gap-y-7 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : sortedProviders.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-[18px] gap-y-7 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedProviders.map(p => <ArtistCard key={p.id} p={p} />)}
              </div>
            ) : (
              <div className="mb-10 rounded-xl border border-sparq-border bg-sparq-cream px-6 py-20 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sparq-coral-light text-sparq-coral-dark"><Search className="h-6 w-6" /></span>
                <h3 className="mb-2 text-[22px] font-bold tracking-[-0.015em]">No artists found</h3>
                <p className="mx-auto mb-[22px] max-w-[380px] text-sm leading-[1.55] text-[#717171]">
                  Try widening your search — remove a filter, change the suburb, or browse a different category.
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button onClick={() => { clearFilters(); setActiveCategory(''); setDate(''); setLocation(''); setLocationInput(''); syncUrl({ q: searchQuery, category: '', location: '', date: '', page: 1 }) }}
                    className="rounded-[10px] bg-sparq-ink px-[18px] py-2.5 text-[13px] font-semibold text-white">Clear all filters</button>
                  <a href="/" className="rounded-[10px] border border-sparq-border bg-white px-[18px] py-2.5 text-[13px] font-semibold">Back to home</a>
                </div>
              </div>
            )}

            {/* Pagination — numbered, design-token styled */}
            {!loading && totalPages > 1 && (
              <div className="mt-2 flex flex-col items-center gap-3 pb-14">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { const prev = Math.max(1, page - 1); setPage(prev); syncUrl({ page: prev }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page <= 1}
                    className="flex items-center gap-1.5 rounded-[10px] border border-sparq-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-sparq-ink disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(pp => pp === 1 || pp === totalPages || Math.abs(pp - page) <= 1)
                      .reduce<(number | '...')[]>((acc, pp, idx, arr) => {
                        if (idx > 0 && pp - (arr[idx - 1] as number) > 1) acc.push('...')
                        acc.push(pp)
                        return acc
                      }, [])
                      .map((pp, i) =>
                        pp === '...'
                          ? <span key={`e-${i}`} className="px-1 text-sm text-[#717171]">…</span>
                          : (
                            <button
                              key={pp}
                              onClick={() => { setPage(pp as number); syncUrl({ page: pp as number }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                              className={`h-9 w-9 rounded-full text-sm font-semibold ${page === pp ? 'bg-sparq-coral text-white' : 'text-sparq-body hover:bg-sparq-surface-warm hover:text-sparq-ink'}`}
                            >
                              {pp}
                            </button>
                          )
                      )}
                  </div>
                  <button
                    onClick={() => { const next = Math.min(totalPages, page + 1); setPage(next); syncUrl({ page: next }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1.5 rounded-[10px] border border-sparq-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-sparq-ink disabled:pointer-events-none disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="font-mono text-[12px] text-[#717171]">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} verified artist{total !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <HomeFooter />
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
