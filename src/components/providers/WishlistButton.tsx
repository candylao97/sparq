'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'

interface WishlistButtonProps {
  providerId: string
}

export function WishlistButton({ providerId }: WishlistButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check initial saved state
  useEffect(() => {
    fetch('/api/wishlists')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.providers) {
          setIsSaved(data.providers.some((p: { id: string }) => p.id === providerId))
        }
      })
      .catch(() => {})
  }, [providerId])

  async function handleToggleWishlist() {
    if (loading) return
    setLoading(true)
    try {
      if (isSaved) {
        const res = await fetch('/api/wishlists', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId }),
        })
        if (res.ok || res.status === 404) setIsSaved(false)
        else if (res.status === 401) {
          window.location.href = '/login'
        }
      } else {
        const res = await fetch('/api/wishlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId }),
        })
        if (res.ok) setIsSaved(true)
        else if (res.status === 401) {
          window.location.href = '/login'
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={loading}
      className={`flex items-center justify-center w-11 h-11 rounded-full border border-[#e8e1de] bg-white hover:bg-[#f9f2ef] transition-colors disabled:opacity-50 ${loading ? 'pointer-events-none' : ''}`}
      aria-label={isSaved ? 'Remove from saved' : 'Save artist'}
    >
      <Heart className={`w-5 h-5 ${isSaved ? 'fill-[#E96B56] text-[#E96B56]' : 'text-[#717171]'}`} />
    </button>
  )
}
