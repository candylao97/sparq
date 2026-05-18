import Link from 'next/link'
import { PhotoSlot } from './PhotoSlot'

type Photo = { id: string; url: string; caption?: string | null }

/** Hero gallery — 1 large + 4 small on desktop (2fr/1fr/1fr × 2 rows),
 *  single hero with counter on mobile. Real photos with placeholder fallback. */
export function ProfileGallery({
  photos,
  totalCount,
  name,
}: {
  photos: Photo[]
  totalCount: number
  name: string
}) {
  const slots = Array.from({ length: 5 }, (_, i) => photos[i] ?? null)
  const labels = ['Hero', 'Photo · 2', 'Photo · 3', 'Photo · 4', 'Studio · 5']

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sparq-border bg-sparq-surface-warm">
      {/* Mobile: single hero */}
      <div className="relative h-[60vw] max-h-[420px] md:hidden">
        <PhotoSlot url={slots[0]?.url} caption={slots[0]?.caption} label={`${name} · ${labels[0]}`} sizes="100vw" priority />
        {totalCount > 0 && (
          <span className="absolute bottom-3.5 left-3.5 z-[2] rounded-full bg-white/95 px-2.5 py-1.5 text-[12px] font-bold">
            1 / {totalCount}
          </span>
        )}
      </div>

      {/* Desktop: 2fr / 1fr / 1fr grid, 2 rows */}
      <div className="hidden h-[460px] grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-0.5 md:grid lg:h-[520px]">
        <PhotoSlot url={slots[0]?.url} caption={slots[0]?.caption} label={labels[0]} className="row-span-2 border-r border-sparq-border/40" sizes="50vw" priority />
        {[1, 2, 3, 4].map((i) => (
          <PhotoSlot
            key={i}
            url={slots[i]?.url}
            caption={slots[i]?.caption}
            label={labels[i]}
            className={i % 2 === 1 ? 'border-r border-sparq-border/40' : ''}
            sizes="25vw"
          />
        ))}
        {totalCount > 5 && (
          <Link
            href="#portfolio"
            className="absolute bottom-3.5 right-3.5 z-[2] inline-flex items-center gap-1.5 rounded-[10px] border border-sparq-ink bg-white px-3.5 py-2 text-[13px] font-semibold hover:bg-sparq-surface-warm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            View all {totalCount} photos
          </Link>
        )}
      </div>
    </div>
  )
}
