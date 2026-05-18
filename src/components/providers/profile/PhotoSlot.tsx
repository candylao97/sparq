import Image from 'next/image'

/** A single photo tile: renders the real image when available, otherwise the
 *  design's empty-photo placeholder (camera glyph + mono label). */
export function PhotoSlot({
  url,
  caption,
  label,
  className = '',
  sizes,
  priority = false,
}: {
  url?: string | null
  caption?: string | null
  label: string
  className?: string
  sizes?: string
  priority?: boolean
}) {
  return (
    <div className={`relative bg-sparq-surface-warm ${className}`}>
      {url ? (
        <Image
          src={url}
          alt={caption || label}
          fill
          sizes={sizes || '(max-width: 768px) 100vw, 50vw'}
          className="object-cover"
          priority={priority}
        />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2.5" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-sparq-muted opacity-50">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="12" cy="12" r="3.5" />
            <circle cx="17.5" cy="8.5" r="0.5" fill="currentColor" />
          </svg>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-sparq-muted">
            {label}
          </span>
        </span>
      )}
    </div>
  )
}
