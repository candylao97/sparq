'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { ProviderCardData } from '@/types'

// Leaflet must be loaded client-side only — avoid SSR issues
let L: typeof import('leaflet') | null = null

interface Props {
  providers: ProviderCardData[]
}

// Melbourne city centre as fallback map centre
const MELBOURNE_LAT = -37.8136
const MELBOURNE_LNG = 144.9631

export function ProviderMapView({ providers }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)

  const mappable = providers.filter(p => p.latitude != null && p.longitude != null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    let isMounted = true

    async function initMap() {
      // Dynamic import to avoid SSR
      const leaflet = await import('leaflet')
      // Inject Leaflet CSS if not already present
      if (!document.querySelector('link[data-leaflet-css]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
        link.setAttribute('data-leaflet-css', '1')
        document.head.appendChild(link)
      }
      L = leaflet.default ?? leaflet

      if (!isMounted || !mapRef.current) return
      // Avoid double-init
      if (mapInstanceRef.current) return

      // Fix leaflet default icon paths broken by bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Find a reasonable centre
      const centreProvider = mappable.find(p => p.latitude && p.longitude)
      const centreLat = centreProvider?.latitude ?? MELBOURNE_LAT
      const centreLng = centreProvider?.longitude ?? MELBOURNE_LNG

      const map = L.map(mapRef.current!, {
        center: [centreLat, centreLng],
        zoom: 12,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Custom price marker icon
      function makePriceIcon(price: number) {
        const label = formatCurrency(price)
        return L!.divIcon({
          className: '',
          html: `<div style="background:#1A1A1A;color:#fff;padding:4px 8px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;">${label}</div>`,
          iconAnchor: [24, 12],
        })
      }

      // Add markers
      mappable.forEach(p => {
        if (!p.latitude || !p.longitude || !L) return
        const minPrice = p.services.length > 0
          ? Math.min(...p.services.map(s => s.price))
          : null

        const icon = minPrice != null ? makePriceIcon(minPrice) : new L.Icon.Default()

        const marker = L.marker([p.latitude, p.longitude], { icon })
          .addTo(map)

        // Popup
        const portfolioImg = p.portfolio[0]?.url
        const imgHtml = portfolioImg
          ? `<img src="${portfolioImg}" style="width:100%;height:100px;object-fit:cover;border-radius:8px 8px 0 0;" alt="${p.name}" />`
          : ''
        const ratingHtml = p.reviewCount > 0
          ? `<span style="font-size:12px;color:#717171;">★ ${p.averageRating.toFixed(1)} (${p.reviewCount})</span>`
          : ''

        marker.bindPopup(`
          <div style="width:180px;font-family:sans-serif;padding:0;">
            ${imgHtml}
            <div style="padding:10px 10px 6px;">
              <p style="font-weight:700;font-size:14px;margin:0 0 2px;">${p.name}</p>
              <p style="font-size:12px;color:#717171;margin:0 0 4px;">${[p.suburb, p.city].filter(Boolean).join(', ')}</p>
              ${ratingHtml}
              ${minPrice != null ? `<p style="font-weight:700;font-size:13px;margin:4px 0 6px;">from ${formatCurrency(minPrice)}</p>` : ''}
              <a href="/providers/${p.id}" style="display:block;background:#E96B56;color:#fff;text-align:center;padding:6px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">Book now</a>
            </div>
          </div>
        `, { maxWidth: 200 })
      })

      // Fit bounds to all markers if we have some
      if (mappable.length > 1) {
        const coords = mappable
          .filter(p => p.latitude && p.longitude)
          .map(p => [p.latitude!, p.longitude!] as [number, number])
        try {
          map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 13 })
        } catch {
          // ignore fitBounds errors
        }
      }

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When providers change (filter update), re-render markers by remounting
  // This is handled by the parent via a key prop change

  if (mappable.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f3ece9] h-[500px]">
        <p className="text-[#717171] text-sm font-medium">No artists with location data found.</p>
        <p className="text-[#717171] text-xs mt-1">Try a different suburb or category.</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#e8e1de] shadow-sm" style={{ height: '600px' }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Badge */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-full px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] shadow-md border border-[#e8e1de]">
        {mappable.length} artist{mappable.length !== 1 ? 's' : ''} on map
      </div>

      {/* List view hint */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Link
          href="#"
          onClick={e => { e.preventDefault() }}
          className="bg-[#1A1A1A] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-[#333] transition-colors"
        >
          Click a pin to preview
        </Link>
      </div>
    </div>
  )
}
