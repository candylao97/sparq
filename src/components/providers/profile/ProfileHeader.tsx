import { Star } from 'lucide-react'

type Badge = { label: string; variant: 'ink' | 'coral' | 'plain' }

export function ProfileHeader({
  name,
  tagline,
  averageRating,
  reviewCount,
  suburb,
  city,
  serviceRadius,
  badges,
}: {
  name: string
  tagline: string | null
  averageRating: number
  reviewCount: number
  suburb: string | null
  city: string | null
  serviceRadius: number | null
  badges: Badge[]
}) {
  const locationLine = [suburb || city, serviceRadius ? `Travels within ${serviceRadius}km` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <header className="border-b border-sparq-border pb-5 pt-4">
      <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[34px]">{name}</h1>
      {tagline && <p className="mt-1.5 max-w-[600px] text-[15px] leading-[1.55] text-sparq-body">{tagline}</p>}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {reviewCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold tabular-nums">
            <Star className="h-3 w-3 fill-sparq-ink text-sparq-ink" aria-hidden="true" />
            {averageRating.toFixed(2)}
            <span className="font-medium text-[#717171]">
              · <a href="#reviews" className="underline decoration-[#717171] underline-offset-2">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</a>
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#717171]">
            <Star className="h-3 w-3 text-[#717171]" aria-hidden="true" />
            New artist · no reviews yet
          </span>
        )}
        {locationLine && (
          <>
            <span className="h-[3px] w-[3px] rounded-full bg-sparq-muted" aria-hidden="true" />
            <span className="text-[14px] text-sparq-body">{locationLine}</span>
          </>
        )}
      </div>

      {badges.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span
              key={b.label}
              className={
                'rounded-full px-2.5 py-1 text-[11px] font-bold ' +
                (b.variant === 'ink'
                  ? 'bg-sparq-ink text-white'
                  : b.variant === 'coral'
                  ? 'bg-sparq-coral text-white'
                  : 'border border-sparq-border bg-sparq-surface-warm text-sparq-ink')
              }
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}
