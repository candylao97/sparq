'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface NearbyProvider {
  id: string
  name: string
  image: string | null
  suburb: string | null
  offerAtHome: boolean
  offerAtStudio: boolean
  minPrice: number
  avgRating: number
  lat: number
  lng: number
  services: { id: string; title: string; price: number; duration: number }[]
}

// ── Suppress default Leaflet icon (we use custom divIcons only) ────
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
}

// ── Markers ────────────────────────────────────────────────────────
//
// Two marker styles:
//   - Price known  → Airbnb-style pill (white/dark) with price label + teardrop
//   - Price unknown → small branded dot (coral unselected, dark selected)
//
// Selected state: dark fill, white text, 1.1× scale, stronger shadow

function createPriceIcon(price: number, selected: boolean) {
  // No price data → dot marker (clean, doesn't show "$0")
  if (price === 0) {
    const bg = selected ? '#1A1A1A' : '#E96B56'
    const size = selected ? 14 : 11
    const offset = Math.round(size / 2)
    return L.divIcon({
      className: '',
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${bg};
        border: 2.5px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,${selected ? '0.30' : '0.18'});
      "></div>`,
      iconSize:   [size, size],
      iconAnchor: [offset, offset],
    })
  }

  // Price known → pill marker
  const label  = `$${Math.round(price)}`
  const bg     = selected ? '#1A1A1A' : '#ffffff'
  const color  = selected ? '#ffffff' : '#1A1A1A'
  const border = selected ? 'transparent' : 'rgba(0,0,0,0.12)'
  const shadow = selected
    ? '0 4px 14px rgba(0,0,0,0.30), 0 1px 4px rgba(0,0,0,0.16)'
    : '0 2px 8px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.08)'
  const scale  = selected ? 'scale(1.10)' : 'scale(1)'

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        transform: ${scale};
        transform-origin: center bottom;
      ">
        <div style="
          background: ${bg};
          color: ${color};
          border: 1.5px solid ${border};
          font-weight: 700;
          font-size: 11px;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          letter-spacing: -0.3px;
          padding: 4px 9px;
          border-radius: 9999px;
          white-space: nowrap;
          box-shadow: ${shadow};
          cursor: pointer;
          line-height: 1.5;
        ">${label}</div>
        <div style="
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid ${bg};
          margin-top: -1px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.10));
        "></div>
      </div>
    `,
    iconSize:   [48, 30],
    iconAnchor: [24, 30],
  })
}

// ── Suburb-level zoom constant ─────────────────────────────────────

const SUBURB_ZOOM = 13

// ── Expose map instance to parent ─────────────────────────────────
// Must be a child of MapContainer to use useMap().

function MapInitializer({ onInit }: { onInit?: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onInit?.(map)
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// ── Fit map to providers on mount ─────────────────────────────────

function FitBounds({ providers }: { providers: NearbyProvider[] }) {
  const map = useMap()
  useEffect(() => {
    if (providers.length === 0) return
    if (providers.length === 1) {
      map.setView([providers[0].lat, providers[0].lng], SUBURB_ZOOM)
      return
    }
    // Centre on the midpoint — never zoom out past suburb level
    const avgLat = providers.reduce((s, p) => s + p.lat, 0) / providers.length
    const avgLng = providers.reduce((s, p) => s + p.lng, 0) / providers.length
    map.setView([avgLat, avgLng], SUBURB_ZOOM)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// ── Smooth pan + zoom to selected marker ──────────────────────────

function FlyToSelected({ selectedId, providers }: { selectedId: string | null; providers: NearbyProvider[] }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const p = providers.find(p => p.id === selectedId)
    if (p) map.flyTo([p.lat, p.lng], SUBURB_ZOOM, { duration: 0.7, easeLinearity: 0.4 })
  }, [selectedId, providers, map])
  return null
}

// ── Main component ─────────────────────────────────────────────────

interface NearbyMapProps {
  providers: NearbyProvider[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Called once the Leaflet map instance is ready — used by parent to wire up custom controls. */
  onMapInit?: (map: L.Map) => void
}

export default function NearbyMap({ providers, selectedId, onSelect, onMapInit }: NearbyMapProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Properly destroy the Leaflet instance on unmount so the container
  // can be reused without "Map container is already initialized" errors.
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <MapContainer
      ref={mapRef}
      center={[-37.8250, 144.9850]}
      zoom={SUBURB_ZOOM}
      minZoom={12}
      maxZoom={17}
      className="h-full w-full"
      style={{ zIndex: 0, background: '#f5f3f0' }}
      zoomControl={false}
      scrollWheelZoom={true}
    >
      {/*
        CartoDB Positron — light, minimal, neutral palette.
        Matches Sparq's cream/neutral design system perfectly.
        Roads render in soft grey, labels are subtle, no color noise.
      */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" style="color:#717171;font-size:10px">OSM</a> &copy; <a href="https://carto.com/attributions" style="color:#717171;font-size:10px">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={17}
        detectRetina
      />

      <MapInitializer onInit={onMapInit} />
      <FitBounds providers={providers} />
      <FlyToSelected selectedId={selectedId} providers={providers} />

      {providers.map(provider => (
        <Marker
          key={provider.id}
          position={[provider.lat, provider.lng]}
          icon={createPriceIcon(provider.minPrice, selectedId === provider.id)}
          zIndexOffset={selectedId === provider.id ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(provider.id) }}
        />
      ))}
    </MapContainer>
  )
}
