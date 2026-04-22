'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react'

interface Photo {
  id: string
  url: string
  caption?: string | null
}

interface GalleryGridProps {
  photos: Photo[]
  name: string
}

export function GalleryGrid({ photos, name }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Keyboard navigation + scroll lock
  useEffect(() => {
    if (lightboxIndex === null) return
    document.body.style.overflow = 'hidden'

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight')
        setLightboxIndex(i => (i !== null ? Math.min(i + 1, photos.length - 1) : null))
      if (e.key === 'ArrowLeft')
        setLightboxIndex(i => (i !== null ? Math.max(i - 1, 0) : null))
      if (e.key === 'Escape') setLightboxIndex(null)
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [lightboxIndex, photos.length])

  if (photos.length === 0) {
    return (
      <div className="aspect-[16/7] rounded-2xl bg-[#f3ece9] flex items-center justify-center">
        <span className="text-8xl font-light text-[#e8e1de]">{name.charAt(0)}</span>
      </div>
    )
  }

  const [p0, p1, p2] = photos

  return (
    <>
      {/* ── Desktop: responsive photo grid ── */}
      <div className="hidden md:block relative">
        {/* 1 photo: full width */}
        {photos.length === 1 && (
          <div className="rounded-2xl overflow-hidden relative">
            <button
              className="block w-full aspect-[4/3] relative group cursor-zoom-in overflow-hidden"
              onClick={() => setLightboxIndex(0)}
              aria-label="View photo 1"
            >
              <Image
                src={p0.url}
                alt={p0.caption || name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                sizes="80vw"
                priority
              />
            </button>
          </div>
        )}

        {/* 2 photos: two equal columns */}
        {photos.length === 2 && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden h-[420px]">
            {[p0, p1].map((photo, i) => (
              <button
                key={photo.id}
                className="relative group cursor-zoom-in overflow-hidden"
                onClick={() => setLightboxIndex(i)}
                aria-label={`View photo ${i + 1}`}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  sizes="40vw"
                  priority={i === 0}
                />
              </button>
            ))}
          </div>
        )}

        {/* 3+ photos: left tall + right two stacked */}
        {photos.length >= 3 && (
          <div className="grid grid-cols-[2fr_1fr] gap-2 rounded-2xl overflow-hidden h-[480px]">
            {/* Left: one tall image */}
            <button
              className="relative group cursor-zoom-in overflow-hidden"
              onClick={() => setLightboxIndex(0)}
              aria-label="View photo 1"
            >
              <Image
                src={p0.url}
                alt={p0.caption || name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                sizes="50vw"
                priority
              />
            </button>

            {/* Right: two stacked images */}
            <div className="flex flex-col gap-2">
              {p1 && (
                <button
                  className="relative flex-1 group cursor-zoom-in overflow-hidden"
                  onClick={() => setLightboxIndex(1)}
                  aria-label="View photo 2"
                >
                  <Image
                    src={p1.url}
                    alt={p1.caption || name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="25vw"
                  />
                </button>
              )}
              {p2 && (
                <button
                  className="relative flex-1 group cursor-zoom-in overflow-hidden"
                  onClick={() => setLightboxIndex(2)}
                  aria-label={photos.length > 3 ? `View all ${photos.length} photos` : 'View photo 3'}
                >
                  <Image
                    src={p2.url}
                    alt={p2.caption || name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    sizes="25vw"
                  />
                  {photos.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                      <span className="text-white font-semibold text-sm flex items-center gap-1.5">
                        <Images className="w-4 h-4" /> +{photos.length - 3} more
                      </span>
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Show all button */}
        <button
          onClick={() => setLightboxIndex(0)}
          className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-[#e8e1de] text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white transition-colors shadow-sm"
        >
          <Images className="w-4 h-4" />
          Show all {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </button>
      </div>

      {/* ── Mobile: hero + thumbnail strip ── */}
      <div className="md:hidden">
        <button
          className="block w-full aspect-[4/3] rounded-2xl overflow-hidden relative"
          onClick={() => setLightboxIndex(0)}
          aria-label="View photo"
        >
          <Image
            src={p0.url}
            alt={name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </button>
        {photos.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {photos.slice(1, 8).map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setLightboxIndex(i + 1)}
                className="flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden relative"
                aria-label={`View photo ${i + 2}`}
              >
                <Image
                  src={photo.url}
                  alt={`Photo ${i + 2}`}
                  fill
                  className="object-cover hover:opacity-80 transition-opacity"
                  sizes="72px"
                />
                {i === 6 && photos.length > 8 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">+{photos.length - 8}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium tabular-nums">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i !== null ? i - 1 : null)) }}
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i !== null ? i + 1 : null)) }}
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[85vh] mx-auto px-16 py-16"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption || name}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 900px"
            />
          </div>

          {/* Caption */}
          {photos[lightboxIndex].caption && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center px-4">
              {photos[lightboxIndex].caption}
            </div>
          )}
        </div>
      )}
    </>
  )
}
