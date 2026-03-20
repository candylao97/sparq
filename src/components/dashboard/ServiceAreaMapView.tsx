'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Large black circle marker with white dot (matching reference design)
const BlackDotIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:48px;height:48px;">
    <div style="width:48px;height:48px;border-radius:50%;background:#1a1a1a;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <div style="width:12px;height:12px;border-radius:50%;background:white;"></div>
    </div>
  </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
})

interface Props {
  latitude: number
  longitude: number
  radius: number // km
  studioAddress: string | null
  providerName?: string
}

function MapUpdater({ center, radius }: { center: [number, number]; radius: number }) {
  const map = useMap()
  const isFirstRender = useRef(true)

  useEffect(() => {
    const fit = () => {
      try {
        const circle = L.circle(center, { radius: radius * 1000 })
        const bounds = circle.getBounds().pad(0.15)
        if (isFirstRender.current) {
          map.fitBounds(bounds)
          isFirstRender.current = false
        } else {
          map.flyToBounds(bounds, { duration: 0.6, easeLinearity: 0.5 })
        }
      } catch {
        setTimeout(fit, 100)
      }
    }
    map.whenReady(fit)
  }, [map, center, radius])

  return null
}

// Custom tooltip component rendered as a Leaflet DivIcon below the marker
function NameLabel({ center, name }: { center: [number, number]; name: string }) {
  const firstName = name.split(' ')[0]
  const label = `${firstName}\u2019s place`

  const labelIcon = L.divIcon({
    className: '',
    html: `<div style="
      white-space:nowrap;
      font-family:var(--font-body), var(--font-sans);
      font-size:13px;
      font-weight:600;
      color:#1a1a1a;
      text-align:center;
      pointer-events:none;
      text-shadow: 0 0 4px white, 0 0 4px white, 0 0 4px white;
    ">${label}</div>`,
    iconSize: [120, 20],
    iconAnchor: [60, -8],
  })

  return <Marker position={center} icon={labelIcon} interactive={false} />
}

export default function ServiceAreaMapView({ latitude, longitude, radius, providerName }: Props) {
  const center: [number, number] = [latitude, longitude]

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#e8e1de]">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: '340px', width: '100%' }}
        className="z-0"
      >
        {/* Google Maps-like tiles (CartoDB Voyager — closest free match) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Zoom controls on the right (matching reference) */}
        <ZoomControl position="topright" />

        {/* Service radius circle — subtle overlay */}
        <Circle
          center={center}
          radius={radius * 1000}
          pathOptions={{
            color: '#E96B56',
            fillColor: '#E96B56',
            fillOpacity: 0.05,
            weight: 1.5,
            dashArray: '6 4',
            opacity: 0.4,
          }}
        />

        {/* Black dot marker */}
        <Marker position={center} icon={BlackDotIcon} />

        {/* Name label below marker */}
        {providerName && <NameLabel center={center} name={providerName} />}

        <MapUpdater center={center} radius={radius} />
      </MapContainer>
    </div>
  )
}
