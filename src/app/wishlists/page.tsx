'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Star, Shield, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import type { ProviderCardData } from '@/types'

export default function WishlistsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [providers, setProviders] = useState<ProviderCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchWishlists = useCallback(async () => {
    try {
      const res = await fetch('/api/wishlists')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProviders(data.providers || [])
    } catch {
      toast.error('Failed to load wishlists')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWishlists()
    }
  }, [status, fetchWishlists])

  async function handleUnsave(providerId: string) {
    setRemovingId(providerId)
    try {
      const res = await fetch('/api/wishlists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      if (!res.ok) throw new Error('Failed to remove')
      setProviders((prev) => prev.filter((p) => p.id !== providerId))
    } catch {
      toast.error('Failed to remove from wishlists')
    } finally {
      setRemovingId(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Heart className="h-7 w-7 fill-rose-500 text-rose-500" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Wishlists</h1>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!loading && providers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#f3ece9]">
              <Heart className="h-10 w-10 text-[#717171]" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[#1A1A1A]">No saved artists yet</h2>
            <p className="mb-6 text-sm text-[#717171]">
              Save artists you love and they&apos;ll appear here.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a63a29]"
            >
              <Search className="h-4 w-4" />
              Explore artists
            </Link>
          </div>
        )}

        {/* Provider grid */}
        {!loading && providers.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {providers.map((provider) => {
              const primaryService = provider.services[0]

              return (
                <div key={provider.id} className="group relative">
                  <Link href={`/providers/${provider.id}`} className="block">
                    {/* Photo */}
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-2xl bg-[#f3ece9]">
                      {provider.portfolio[0] ? (
                        <Image
                          src={provider.portfolio[0].url}
                          alt={provider.name || 'Artist'}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f9f2ef] to-[#f3ece9]">
                          <span className="text-5xl font-bold text-[#717171]">
                            {provider.name?.charAt(0) ?? 'A'}
                          </span>
                        </div>
                      )}

                      {/* Heart button — filled red, unsave on click */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleUnsave(provider.id)
                        }}
                        disabled={removingId === provider.id}
                        className="absolute right-3 top-3 z-10 p-1 transition-transform active:scale-90 disabled:opacity-50"
                        aria-label="Remove from wishlists"
                      >
                        <Heart
                          className={`h-6 w-6 drop-shadow-md transition-colors ${
                            removingId === provider.id
                              ? 'fill-[#e8e1de] text-[#717171]'
                              : 'fill-rose-500 text-rose-500'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="space-y-0.5">
                      {/* Location + rating */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[#1A1A1A]">
                          {provider.suburb
                            ? `${provider.suburb}, ${provider.city}`
                            : provider.city}
                        </p>
                        {provider.reviewCount > 0 && (
                          <div className="flex flex-shrink-0 items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-[#1A1A1A] text-[#1A1A1A]" />
                            <span className="text-sm font-medium text-[#1A1A1A]">
                              {provider.averageRating.toFixed(2)}
                            </span>
                            <span className="text-xs text-[#717171]">
                              ({provider.reviewCount})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <p className="truncate text-sm text-[#717171]">{provider.name}</p>

                      {/* Location type */}
                      <p className="text-sm text-[#717171]">
                        {provider.offerAtHome && provider.offerAtStudio
                          ? 'Home & studio'
                          : provider.offerAtHome
                            ? 'Comes to you'
                            : 'At a studio'}
                      </p>

                      {/* Price + verified */}
                      <div className="flex items-center justify-between pt-1.5">
                        <p className="text-sm text-[#1A1A1A]">
                          <span className="font-semibold">
                            {primaryService
                              ? formatCurrency(primaryService.price)
                              : 'POA'}
                          </span>
                          {primaryService && (
                            <span className="font-normal text-[#717171]"> / visit</span>
                          )}
                        </p>
                        {provider.isVerified && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs text-[#717171]">Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
