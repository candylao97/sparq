'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, Star } from 'lucide-react'

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

interface ArtistBottomSheetProps {
  providers: NearbyProvider[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ArtistBottomSheet({ providers, selectedId, onSelect }: ArtistBottomSheetProps) {
  const [collapsed, setCollapsed] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!selectedId) return
    const el = cardRefs.current.get(selectedId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedId])

  const locationLabel = (p: NearbyProvider) => {
    if (p.offerAtHome && p.offerAtStudio) return 'At home & Studio'
    if (p.offerAtHome) return 'At home'
    if (p.offerAtStudio) return 'Studio'
    return ''
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'white',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        transition: 'height 300ms ease-in-out',
        height: collapsed ? '64px' : '62vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header / drag handle area */}
      <div
        onClick={() => setCollapsed(prev => !prev)}
        style={{
          flexShrink: 0,
          padding: '12px 16px 8px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Drag handle pill */}
        <div
          style={{
            width: 40,
            height: 4,
            background: '#e8e1de',
            borderRadius: 9999,
            margin: '0 auto 10px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', fontFamily: 'inherit' }}>
            {providers.length} artist{providers.length !== 1 ? 's' : ''} nearby
          </span>
          {collapsed ? (
            <ChevronUp size={18} color="#717171" />
          ) : (
            <ChevronDown size={18} color="#717171" />
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {providers.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#717171' }}>No artists found in this area.</p>
          </div>
        ) : (
          providers.map((provider, idx) => {
            const isSelected = selectedId === provider.id
            const topService = provider.services[0]

            return (
              <div
                key={provider.id}
                ref={el => {
                  if (el) cardRefs.current.set(provider.id, el)
                  else cardRefs.current.delete(provider.id)
                }}
                onClick={() => onSelect(provider.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: isSelected ? '#f9f2ef' : 'white',
                  borderLeft: isSelected ? '2px solid #E96B56' : '2px solid transparent',
                  borderBottom: idx < providers.length - 1 ? '1px solid #f3ece9' : 'none',
                  cursor: 'pointer',
                  transition: 'background 150ms',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #E96B56 0%, #a63a29 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'white',
                    overflow: 'hidden',
                  }}
                >
                  {provider.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={provider.image}
                      alt={provider.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    provider.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1A1A1A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {provider.name}
                    </span>
                    {provider.avgRating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <Star size={12} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>
                          {provider.avgRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#717171',
                      margin: '2px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {topService?.title ?? 'Artist'}
                    {provider.suburb ? ` · ${provider.suburb}` : ''}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#717171' }}>
                      from{' '}
                      <span style={{ fontWeight: 700, color: '#1A1A1A' }}>
                        ${Math.round(provider.minPrice)}
                      </span>
                      {locationLabel(provider) ? ` · ${locationLabel(provider)}` : ''}
                    </span>
                    <Link
                      href={`/book/${provider.id}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        style={{
                          borderRadius: 12,
                          border: '1px solid #e8e1de',
                          background: 'white',
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#1A1A1A',
                          cursor: 'pointer',
                          transition: 'border-color 150ms',
                        }}
                      >
                        Book
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
