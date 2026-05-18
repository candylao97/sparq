import Link from 'next/link'

const CATEGORIES = [
  { name: 'Nails', count: 8, from: 55, q: 'nails' },
  { name: 'Lashes', count: 6, from: 95, q: 'lashes' },
  { name: 'Makeup', count: 4, from: 140, q: 'makeup' },
] as const

export function HomeCategories() {
  return (
    <section className="pb-[18px] pt-1 md:pb-6 md:pt-3 lg:pb-7 lg:pt-4" aria-labelledby="cats-heading">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="mb-5 flex items-end justify-between gap-4 lg:mb-6">
          <h2 id="cats-heading" className="text-[22px] font-bold tracking-[-0.02em] md:text-[26px] lg:text-[28px]">
            What are you in the mood for?
          </h2>
          <Link href="/search" className="flex-shrink-0 border-b border-sparq-ink pb-0.5 text-[13px] font-semibold">
            See all artists
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          {CATEGORIES.map((c) => (
            <Link key={c.name} href={`/search?category=${c.q}`} className="group">
              <div className="relative h-[200px] overflow-hidden rounded-2xl border border-sparq-border bg-sparq-surface-warm md:h-[260px] lg:h-[300px]">
                <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold tabular-nums">
                  {c.count} artists
                </span>
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sparq-muted opacity-45" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="12" cy="12" r="3.5" />
                    <circle cx="17.5" cy="8.5" r="0.5" fill="currentColor" />
                  </svg>
                  <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-sparq-muted">
                    {c.name} · photo
                  </span>
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1.5 px-1 pt-2.5">
                <span className="text-[15px] font-bold tracking-[-0.01em] md:text-[18px]">{c.name}</span>
                <span className="text-[12px] tabular-nums text-[#717171] md:text-[13px]">from ${c.from}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
