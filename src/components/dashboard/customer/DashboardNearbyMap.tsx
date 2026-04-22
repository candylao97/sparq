'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type L    from 'leaflet'
import Star        from 'lucide-react/dist/esm/icons/star'
import ArrowRight  from 'lucide-react/dist/esm/icons/arrow-right'
import Home        from 'lucide-react/dist/esm/icons/home'
import Building2   from 'lucide-react/dist/esm/icons/building-2'
import MapPin      from 'lucide-react/dist/esm/icons/map-pin'
import List        from 'lucide-react/dist/esm/icons/list'
import Plus        from 'lucide-react/dist/esm/icons/plus'
import Minus       from 'lucide-react/dist/esm/icons/minus'
import LocateFixed from 'lucide-react/dist/esm/icons/locate-fixed'
import Loader2     from 'lucide-react/dist/esm/icons/loader-2'

// ── Types ──────────────────────────────────────────────────────────

export interface CardItem {
  id: string
  name: string
  topService: string
  suburb: string | null
  rating: number
  minPrice: number
  bookingCount: number
  offerAtHome: boolean
  offerAtStudio: boolean
}

interface NearbyProvider {
  id: string; name: string; image: string | null; suburb: string | null
  offerAtHome: boolean; offerAtStudio: boolean
  minPrice: number; avgRating: number; lat: number; lng: number
  services: { id: string; title: string; price: number; duration: number }[]
}

type ModeFilter = 'all' | 'home' | 'studio'
type ViewMode   = 'map' | 'list'

// ── Coordinates ────────────────────────────────────────────────────

const SUBURB_COORDS: Record<string, [number, number]> = {
  richmond:      [-37.8183, 144.9977],
  hawthorn:      [-37.8224, 145.0273],
  toorak:        [-37.8428, 145.0144],
  'box hill':    [-37.8194, 145.1213],
  fitzroy:       [-37.7981, 144.9789],
  'south yarra': [-37.8394, 145.0000],
  prahran:       [-37.8500, 144.9936],
  collingwood:   [-37.8031, 144.9872],
  carlton:       [-37.7992, 144.9706],
  brunswick:     [-37.7657, 144.9612],
}
const CBD: [number, number] = [-37.8136, 144.9631]

function getCoords(suburb: string | null, id: string): [number, number] {
  if (suburb) {
    const key = suburb.toLowerCase().trim()
    if (SUBURB_COORDS[key]) return SUBURB_COORDS[key]
  }
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return [CBD[0] + ((h % 20) - 10) * 0.001, CBD[1] + (((h * 7) % 20) - 10) * 0.001]
}

function toProvider(item: CardItem): NearbyProvider {
  const [lat, lng] = getCoords(item.suburb, item.id)
  return {
    id: item.id, name: item.name, image: null,
    suburb: item.suburb, offerAtHome: item.offerAtHome, offerAtStudio: item.offerAtStudio,
    minPrice: item.minPrice, avgRating: item.rating, lat, lng,
    services: [{ id: item.id, title: item.topService, price: item.minPrice, duration: 60 }],
  }
}

// ── Availability helpers ───────────────────────────────────────────

function isToday(id: string) {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4 === 0
}

function availLabel(id: string) {
  if (isToday(id)) return { label: 'Available today', today: true }
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const d = (h % 4) + 1
  const t = new Date(); t.setDate(t.getDate() + d)
  return {
    label: `Avail. ${t.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}`,
    today: false,
  }
}

// ── Images ────────────────────────────────────────────────────────

const NAIL_IMGS = [
  'https://images.unsplash.com/photo-1604655855317-b81ed9b3c46c',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b',
  'https://images.unsplash.com/photo-1604902396830-aca29e19b067',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371',
]
const LASH_IMGS = [
  'https://images.unsplash.com/photo-1583001931096-959e9a1a6223',
  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b',
]
function getImg(service: string, id: string, size = 'w=400&h=500') {
  const pool = /lash|brow/i.test(service) ? LASH_IMGS : NAIL_IMGS
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return `${pool[h % pool.length]}?auto=format&fit=crop&${size}&q=80`
}

// ── Dynamic map ────────────────────────────────────────────────────

const NearbyMap = dynamic(() => import('@/components/nearby/NearbyMap'), { ssr: false })

// ── Portrait card (map bottom strip) ──────────────────────────────

function MapCard({
  item, selected, onSelect, setRef,
}: {
  item: CardItem
  selected: boolean
  onSelect: (id: string) => void
  setRef: (el: HTMLDivElement | null) => void
}) {
  const avail = availLabel(item.id)

  return (
    <div
      ref={setRef}
      onClick={() => onSelect(item.id)}
      style={{
        boxShadow: selected
          ? '0 0 0 2.5px #E96B56, 0 10px 32px rgba(0,0,0,0.15)'
          : '0 1px 6px rgba(0,0,0,0.07)',
        borderRadius: 18,
        flexShrink: 0,
        width: 168,
        cursor: 'pointer',
        background: 'white',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: selected ? 'translateY(-3px)' : 'none',
      }}
      className="group"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-[#f3ece9]" style={{ aspectRatio: '4/5' }}>
        <img
          src={getImg(item.topService, item.id)}
          alt={item.topService}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {/* "Today" badge — top left, coral */}
        {avail.today && (
          <div className="absolute left-2 top-2 rounded-full bg-[#E96B56] px-2 py-0.5 shadow-sm">
            <span className="text-[10px] font-bold text-white tracking-wide">Today</span>
          </div>
        )}

        {/* Rating pill — top right */}
        {item.rating > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 shadow-sm backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-semibold text-[#1A1A1A]">{item.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Price — bottom left, always visible */}
        {item.minPrice > 0 && (
          <div className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 shadow-sm backdrop-blur-sm">
            <span className="text-[10px] font-bold text-[#1A1A1A]">from ${item.minPrice}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pb-3 pt-2">
        <p className="truncate text-[0.82rem] font-semibold leading-snug text-[#1A1A1A]">{item.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-[#717171]">{item.topService}</p>

        {/* Location row */}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-[#717171]">
          {item.offerAtHome
            ? <Home className="h-3 w-3 flex-shrink-0" />
            : <Building2 className="h-3 w-3 flex-shrink-0" />}
          <span className="truncate">{item.suburb ?? (item.offerAtHome ? 'At home' : 'Studio')}</span>
        </div>

        {/* Availability */}
        <div className="mt-1 flex items-center gap-1">
          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${avail.today ? 'bg-green-400' : 'bg-[#d0c8c4]'}`} />
          <span className={`text-[10px] font-medium ${avail.today ? 'text-green-600' : 'text-[#717171]'}`}>
            {avail.label}
          </span>
        </div>

        {/* CTA — coral for primary action */}
        <Link
          href={`/book/${item.id}`}
          onClick={e => e.stopPropagation()}
          className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-full bg-[#E96B56] py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#d4604c]"
        >
          Book now <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  )
}

// ── List card (full-width horizontal) ─────────────────────────────

function ListCard({ item }: { item: CardItem }) {
  const avail = availLabel(item.id)

  return (
    <Link
      href={`/book/${item.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-[#e8e1de] bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] hover:-translate-y-0.5"
    >
      {/* Thumbnail */}
      <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-[#f3ece9]">
        <img
          src={getImg(item.topService, item.id, 'w=160&h=160')}
          alt={item.topService}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {avail.today && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#E96B56]/90 py-0.5 text-center">
            <span className="text-[9px] font-bold text-white">Today</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-[#1A1A1A]">{item.name}</p>
          {item.minPrice > 0 && (
            <span className="flex-shrink-0 text-sm font-bold text-[#1A1A1A]">from ${item.minPrice}</span>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-[#717171]">{item.topService}</p>

        <div className="mt-1 flex items-center gap-3">
          {item.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-medium text-[#1A1A1A]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {item.rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[11px] text-[#717171]">
            {item.offerAtHome
              ? <Home className="h-3 w-3 flex-shrink-0" />
              : <Building2 className="h-3 w-3 flex-shrink-0" />}
            {item.suburb ?? (item.offerAtHome ? 'At home' : 'Studio')}
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-medium ${avail.today ? 'text-green-600' : 'text-[#717171]'}`}>
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${avail.today ? 'bg-green-400' : 'bg-[#d0c8c4]'}`} />
            {avail.label}
          </span>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#717171] transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────

interface Props { items: CardItem[] }

export function DashboardNearbyMap({ items }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const [view, setView]             = useState<ViewMode>('map')
  const [mode, setMode]             = useState<ModeFilter>('all')
  const [topRated, setTopRated]     = useState(false)
  // Default to "available today" — highest-intent users see bookable artists immediately
  const [todayOnly, setTodayOnly]   = useState(true)
  const [locating, setLocating]     = useState(false)

  const cardRefs   = useRef<Map<string, HTMLDivElement>>(new Map())
  const mapRef     = useRef<L.Map | null>(null)

  // ── Custom map control handlers ────────────────────────────────
  function handleZoomIn()  { mapRef.current?.zoomIn() }
  function handleZoomOut() { mapRef.current?.zoomOut() }
  function handleLocate() {
    if (!navigator.geolocation || !mapRef.current) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 1 })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 60000 },
    )
  }

  // Apply filters
  const filtered = items
    .filter(i => mode === 'home' ? i.offerAtHome : mode === 'studio' ? i.offerAtStudio : true)
    .filter(i => topRated  ? i.rating >= 4.0 : true)
    .filter(i => todayOnly ? isToday(i.id)   : true)

  const providers = filtered.map(toProvider)

  // When "today only" yields 0 results, fall back gracefully
  const todayOnlyEmpty = todayOnly && filtered.length === 0

  const providers_or_fallback = todayOnlyEmpty
    ? items
        .filter(i => mode === 'home' ? i.offerAtHome : mode === 'studio' ? i.offerAtStudio : true)
        .filter(i => topRated ? i.rating >= 4.0 : true)
    : filtered

  const displayedProviders = todayOnlyEmpty ? providers_or_fallback.map(toProvider) : providers
  const displayedFiltered  = todayOnlyEmpty ? providers_or_fallback : filtered

  // Sync map pin click → scroll card into view
  useEffect(() => {
    if (!selectedId || view !== 'map') return
    const el = cardRefs.current.get(selectedId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedId, view])

  // Keep selectedId valid when filter changes
  useEffect(() => {
    const list = todayOnlyEmpty ? providers_or_fallback : filtered
    if (selectedId && !list.find(i => i.id === selectedId)) {
      setSelectedId(list[0]?.id ?? null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, topRated, todayOnly])

  const todayCount = items.filter(i =>
    (mode === 'home' ? i.offerAtHome : mode === 'studio' ? i.offerAtStudio : true) && isToday(i.id)
  ).length

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[1rem] font-semibold text-[#1A1A1A]">
            {todayOnly && !todayOnlyEmpty ? 'Book today near you' : 'Artists near you'}
          </h2>
          <p className="mt-0.5 text-xs text-[#717171]">
            {todayOnlyEmpty
              ? `No openings today · showing ${displayedFiltered.length} artist${displayedFiltered.length !== 1 ? 's' : ''} nearby`
              : `${displayedFiltered.length} artist${displayedFiltered.length !== 1 ? 's' : ''} available${todayOnly ? ' today' : ' near you'}`
            }
          </p>
        </div>

        {/* Map / List toggle */}
        <div className="flex overflow-hidden rounded-full border border-[#e8e1de] bg-white p-0.5">
          {(['map', 'list'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
                view === v ? 'bg-[#1A1A1A] text-white' : 'text-[#717171] hover:text-[#1A1A1A]'
              }`}
            >
              {v === 'map'
                ? <><MapPin className="h-3 w-3" /> Map</>
                : <><List className="h-3 w-3" /> List</>
              }
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {/* Mode */}
        {([
          { key: 'all',    label: 'All' },
          { key: 'home',   label: 'At home' },
          { key: 'studio', label: 'Studio' },
        ] as { key: ModeFilter; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setMode(f.key)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
              mode === f.key
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                : 'border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#c0b8b4]'
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Top rated */}
        <button
          onClick={() => setTopRated(v => !v)}
          className={`flex-shrink-0 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
            topRated
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : 'border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#c0b8b4]'
          }`}
        >
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          Top rated
        </button>

        {/* Available today — highlighted when active */}
        <button
          onClick={() => setTodayOnly(v => !v)}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
            todayOnly
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-[#e8e1de] bg-white text-[#1A1A1A] hover:border-[#c0b8b4]'
          }`}
        >
          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${todayOnly ? 'bg-white' : 'bg-green-400'}`} />
          {todayOnly ? `${todayCount} today` : 'Available today'}
        </button>

        <Link
          href="/nearby"
          className="ml-auto flex-shrink-0 flex items-center gap-1 rounded-full border border-[#e8e1de] bg-white px-3 py-1.5 text-xs font-medium text-[#717171] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all"
        >
          Full map <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── "No openings today" banner — shown inline, doesn't block ── */}
      {todayOnlyEmpty && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5">
          <p className="text-xs text-amber-800">No openings today near you — showing next available slots.</p>
          <button
            onClick={() => setTodayOnly(false)}
            className="ml-3 flex-shrink-0 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
          >
            See all
          </button>
        </div>
      )}

      {/* ── MAP VIEW ── */}
      {view === 'map' && (
        <>
          {/* Map container */}
          <div className="relative w-full overflow-hidden bg-[#f5f3f0]"
            style={{
              height: 320,
              borderRadius: 20,
              boxShadow: '0 2px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            {displayedFiltered.length > 0 ? (
              <>
                <NearbyMap
                  providers={displayedProviders}
                  selectedId={selectedId}
                  onSelect={id => setSelectedId(id)}
                  onMapInit={map => { mapRef.current = map }}
                />

                {/* ── Custom zoom controls — bottom-right overlay ── */}
                <div
                  className="absolute bottom-3 right-3 flex flex-col items-center gap-2"
                  style={{ zIndex: 1000 }}
                  onWheel={e => e.stopPropagation()}
                >
                  {/* Zoom pill: + / divider / − */}
                  <div className="flex flex-col overflow-hidden rounded-xl border border-[#e8e1de] bg-white"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.08)' }}>
                    <button
                      onClick={handleZoomIn}
                      aria-label="Zoom in"
                      className="flex h-8 w-8 items-center justify-center text-[#1A1A1A] transition-colors hover:bg-[#f5f3f0] active:bg-[#ede6e3]"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                    <div className="h-px bg-[#e8e1de]" />
                    <button
                      onClick={handleZoomOut}
                      aria-label="Zoom out"
                      className="flex h-8 w-8 items-center justify-center text-[#1A1A1A] transition-colors hover:bg-[#f5f3f0] active:bg-[#ede6e3]"
                    >
                      <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Locate button */}
                  <button
                    onClick={handleLocate}
                    aria-label="Find my location"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8e1de] bg-white text-[#1A1A1A] transition-colors hover:bg-[#f5f3f0] active:bg-[#ede6e3]"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.08)' }}
                  >
                    {locating
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#717171]" />
                      : <LocateFixed className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>

                {/* Bottom fade */}
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-16"
                  style={{ background: 'linear-gradient(to bottom, transparent, rgba(253,251,247,0.55))' }}
                />
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-sm text-[#717171]">No artists match your filters.</p>
                <button
                  onClick={() => { setMode('all'); setTopRated(false); setTodayOnly(false) }}
                  className="rounded-full border border-[#1A1A1A] px-4 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Bottom scroll strip */}
          {displayedFiltered.length > 0 && (
            <div
              className="mt-2 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6"
              style={{ scrollbarWidth: 'none' }}
            >
              {displayedFiltered.map(item => (
                <MapCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={id => setSelectedId(id)}
                  setRef={el => {
                    if (el) cardRefs.current.set(item.id, el)
                    else cardRefs.current.delete(item.id)
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="space-y-2.5">
          {displayedFiltered.length > 0
            ? displayedFiltered.map(item => <ListCard key={item.id} item={item} />)
            : (
              <div className="rounded-2xl border border-dashed border-[#e8e1de] py-10 text-center">
                <p className="text-sm text-[#717171]">No artists match your filters.</p>
                <button
                  onClick={() => { setMode('all'); setTopRated(false); setTodayOnly(false) }}
                  className="mt-3 rounded-full border border-[#1A1A1A] px-4 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
