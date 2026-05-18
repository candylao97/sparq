import Link from 'next/link'
import { Star } from 'lucide-react'
import { PhotoSlot } from './PhotoSlot'
import { formatCurrency } from '@/lib/utils'

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
)

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-b border-sparq-border py-7 last:border-b-0">
      <h2 className="mb-4 text-[22px] font-bold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  )
}

/* ── About (tagline only — no bio, per design hard constraint) ── */
export function AboutSection({ tagline, sinceYear }: { tagline: string | null; sinceYear: number | null }) {
  return (
    <Section title="About">
      <div className="flex items-start gap-3.5 rounded-xl border border-sparq-border bg-sparq-surface-warm px-5 py-[18px]">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-sparq-border bg-white text-[#717171]" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </span>
        <p className="text-[14px] leading-[1.55] text-sparq-body">
          {tagline ? <strong className="font-semibold text-sparq-ink">{tagline}</strong> : <span className="text-[#717171]">This artist hasn&apos;t added a tagline yet.</span>}
          {sinceYear ? ` On Sparq since ${sinceYear}.` : ''}
        </p>
      </div>
    </Section>
  )
}

/* ── Services ── */
type Service = { id: string; title: string; description?: string | null; duration: number; price: number }

export function ServicesSection({ services, providerProfileId }: { services: Service[]; providerProfileId: string }) {
  if (services.length === 0) {
    return (
      <Section title="Services">
        <div className="rounded-xl border border-dashed border-sparq-border bg-sparq-cream px-6 py-8 text-center">
          <p className="text-sm font-semibold">No services listed yet</p>
          <p className="mt-1 text-xs text-[#717171]">This artist hasn&apos;t published any services. Check back soon.</p>
        </div>
      </Section>
    )
  }
  return (
    <Section title="Services">
      <ul className="flex flex-col">
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/book/${providerProfileId}?serviceId=${s.id}`}
              className="flex items-center gap-4 border-b border-sparq-border/60 py-4 last:border-b-0 hover:rounded-xl hover:bg-sparq-surface-warm/40 hover:px-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-sparq-ink">{s.title}</span>
                <span className="mt-0.5 block text-[13px] text-[#717171]">
                  {s.duration} min{s.description ? ` · ${s.description}` : ''}
                </span>
              </span>
              <span className="text-[16px] font-bold tabular-nums">{formatCurrency(s.price)}</span>
              <span className="flex text-[#717171]"><Chevron /></span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* ── Portfolio ── */
type Photo = { id: string; url: string; caption?: string | null }

export function PortfolioSection({ photos, totalCount }: { photos: Photo[]; totalCount: number }) {
  const shown = photos.slice(0, 8)
  const slotCount = shown.length > 0 ? Math.max(shown.length, 4) : 8
  const slots = Array.from({ length: slotCount }, (_, i) => shown[i] ?? null)

  return (
    <Section id="portfolio" title="Portfolio">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4 lg:gap-3">
        {slots.map((p, i) => (
          <PhotoSlot
            key={p?.id ?? i}
            url={p?.url}
            caption={p?.caption}
            label={p ? `Work · ${i + 1}` : 'More coming soon'}
            className="aspect-square overflow-hidden rounded-2xl border border-sparq-border"
            sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 22vw"
          />
        ))}
      </div>
      {totalCount > 8 && (
        <button className="mt-[18px] inline-flex items-center gap-1.5 rounded-[10px] border border-sparq-ink bg-white px-[18px] py-[11px] text-[14px] font-semibold hover:bg-sparq-surface-warm">
          View all {totalCount} photos
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
        </button>
      )}
    </Section>
  )
}

/* ── Reviews (populated + empty) ── */
type Review = { id: string; rating: number; text: string | null; createdAt: string | Date; customer: { name: string | null } }

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ReviewsSection({
  reviews,
  averageRating,
  reviewCount,
  providerProfileId,
  artistFirstName,
}: {
  reviews: Review[]
  averageRating: number
  reviewCount: number
  providerProfileId: string
  artistFirstName: string
}) {
  if (reviewCount === 0) {
    return (
      <Section id="reviews" title="Reviews">
        <div className="rounded-xl border border-sparq-border bg-sparq-cream px-6 py-10 text-center">
          <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sparq-coral-light text-sparq-coral-dark" aria-hidden="true">
            <Star className="h-5 w-5" />
          </span>
          <h3 className="text-[18px] font-bold">Be the first to book with {artistFirstName}</h3>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[13.5px] leading-[1.55] text-sparq-body">
            This artist is new to Sparq. Reviews appear here once clients complete their first appointments.
          </p>
          <Link href={`/book/${providerProfileId}`} className="mt-[18px] inline-block rounded-[10px] bg-sparq-ink px-[18px] py-2.5 text-[13px] font-semibold text-white">
            Request to book
          </Link>
        </div>
      </Section>
    )
  }

  const fiveStarPct = Math.round((reviews.filter((r) => r.rating === 5).length / reviews.length) * 100)
  const shown = reviews.slice(0, 6)

  return (
    <Section id="reviews" title="Reviews">
      <div className="mb-[22px] flex items-center gap-[18px]">
        <span className="inline-flex items-center gap-2 text-[32px] font-bold tracking-[-0.02em]">
          <Star className="h-[22px] w-[22px] fill-sparq-ink text-sparq-ink" aria-hidden="true" />
          {averageRating.toFixed(2)}
        </span>
        <span className="text-[14px] text-[#717171]">
          <strong className="text-sparq-ink">{reviewCount} reviews</strong> · {fiveStarPct}% 5-star
        </span>
      </div>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 md:gap-x-7 md:gap-y-[22px]">
        {shown.map((r) => (
          <div key={r.id}>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sparq-border bg-sparq-surface-warm text-[13px] font-bold text-[#717171]" aria-hidden="true">
                {(r.customer.name || '?').charAt(0).toUpperCase()}
              </span>
              <span>
                <span className="block text-[14px] font-semibold">{r.customer.name || 'Client'}</span>
                <span className="block text-[12px] text-[#717171]">{fmtDate(r.createdAt)}</span>
              </span>
            </div>
            <div className="mb-1.5 flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-[11px] w-[11px] ${i < r.rating ? 'fill-sparq-ink text-sparq-ink' : 'text-sparq-border'}`} aria-hidden="true" />
              ))}
            </div>
            {r.text && <p className="text-[14px] leading-[1.55] text-sparq-body">{r.text}</p>}
          </div>
        ))}
      </div>

      {reviewCount > 6 && (
        <button className="mt-6 inline-flex items-center gap-1.5 rounded-[10px] border border-sparq-ink bg-white px-[18px] py-[11px] text-[14px] font-semibold hover:bg-sparq-surface-warm">
          Show all {reviewCount} reviews
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
        </button>
      )}
    </Section>
  )
}

/* ── Location (suburb + service area only — no exact address) ── */
export function LocationSection({
  suburb,
  city,
  serviceRadius,
}: {
  suburb: string | null
  city: string | null
  serviceRadius: number | null
}) {
  return (
    <Section title="Location">
      <div className="flex items-start gap-4 rounded-xl border border-sparq-border bg-sparq-cream p-5">
        <span className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-[10px] border border-sparq-border bg-sparq-surface-warm" aria-hidden="true">
          <span className="absolute left-8 top-[22px] h-2.5 w-2.5 rounded-full bg-sparq-coral shadow-[0_0_0_3px_#fff]" />
        </span>
        <div>
          <h3 className="text-[16px] font-bold">{[suburb, city].filter(Boolean).join(' · ') || 'Location on request'}</h3>
          <p className="mt-1 text-[13.5px] leading-[1.55] text-sparq-body">
            {serviceRadius
              ? `This artist also travels within ${serviceRadius}km of ${suburb || city || 'their studio'}.`
              : 'Service area shared on request.'}
          </p>
          <p className="mt-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-sparq-muted">
            Exact address shared after booking
          </p>
        </div>
      </div>
    </Section>
  )
}
