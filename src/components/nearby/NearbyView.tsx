'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArtistBottomSheet } from './ArtistBottomSheet'

const NearbyMap = dynamic(() => import('./NearbyMap'), { ssr: false })

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

type FilterType = 'all' | 'home' | 'studio' | 'top'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'home', label: 'At home' },
  { key: 'studio', label: 'Studio' },
  { key: 'top', label: 'Top rated' },
]

function applyFilter(providers: NearbyProvider[], filter: FilterType): NearbyProvider[] {
  switch (filter) {
    case 'home':
      return providers.filter(p => p.offerAtHome)
    case 'studio':
      return providers.filter(p => p.offerAtStudio)
    case 'top':
      return providers.filter(p => p.avgRating >= 4)
    default:
      return providers
  }
}

export function NearbyView() {
  const [providers, setProviders] = useState<NearbyProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/providers/nearby')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setProviders(data.providers ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredProviders = applyFilter(providers, activeFilter)

  return (
    <div
      style={{
        position: 'relative',
        height: '100svh',
        width: '100%',
        overflow: 'hidden',
        background: '#FDFBF7',
      }}
    >
      {/* Map layer */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {!loading && (
          <NearbyMap
            providers={filteredProviders}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f9f2ef',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid #e8e1de',
                  borderTopColor: '#E96B56',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              <p style={{ fontSize: 13, color: '#717171' }}>Finding artists near you…</p>
            </div>
          </div>
        )}
      </div>

      {/* Top floating bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          zIndex: 1000,
          padding: '16px 16px 8px',
        }}
      >
        {/* Back button + title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Link href="/dashboard/customer">
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 9999,
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#1A1A1A',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ← Back
            </button>
          </Link>
          <div
            style={{
              flex: 1,
              borderRadius: 16,
              background: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '10px 16px',
              fontSize: 14,
              color: '#717171',
            }}
          >
            Nail &amp; lash artists near you
          </div>
        </div>

        {/* Filter pills */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}
        >
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                borderRadius: 9999,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                border: activeFilter === f.key ? 'none' : '1px solid #e8e1de',
                background: activeFilter === f.key ? '#1A1A1A' : 'white',
                color: activeFilter === f.key ? 'white' : '#717171',
                cursor: 'pointer',
                transition: 'background 150ms, color 150ms',
                boxShadow: activeFilter === f.key ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom sheet */}
      {!loading && (
        <ArtistBottomSheet
          providers={filteredProviders}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
