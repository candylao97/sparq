import { Search, ChevronDown } from 'lucide-react'

/** Display-only search segment (the design treats these as placeholders that
 *  submit to /search; real dropdowns are out of scope for this design). */
function Segment({ label, value, valueSet = false, chevron = true }: {
  label: string
  value: string
  valueSet?: boolean
  chevron?: boolean
}) {
  return (
    <div className="relative flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border-sparq-border px-[22px] py-[9px] text-left first:border-l-0 [&:not(:first-child)]:border-l hover:bg-sparq-surface-warm lg:px-[26px] lg:py-[11px]">
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-bold">{label}</span>
        <span className={`mt-0.5 truncate text-[13px] lg:text-[14px] ${valueSet ? 'text-sparq-ink' : 'text-[#717171]'}`}>{value}</span>
      </span>
      {chevron && <ChevronDown className="h-3 w-3 flex-shrink-0 text-[#717171]" aria-hidden="true" />}
    </div>
  )
}

function MobileRow({ label, value, valueSet = false }: { label: string; value: string; valueSet?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-sparq-border bg-white px-4 py-3 text-left">
      <span className="flex flex-col items-start">
        <span className="text-[11px] font-bold text-sparq-ink">{label}</span>
        <span className={`mt-px text-[13px] ${valueSet ? 'text-sparq-ink' : 'text-[#717171]'}`}>{value}</span>
      </span>
      <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[#717171]" aria-hidden="true" />
    </div>
  )
}

export function HomeHero() {
  return (
    <section className="py-12 md:py-[68px] lg:py-[88px]">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="text-center">
          <h1 className="mx-auto mb-4 max-w-[980px] font-bold leading-[1.02] tracking-[-0.03em] text-[clamp(40px,6.6vw,92px)]">
            Book trusted nail, lash &amp;<br className="hidden md:inline" /> makeup artists in Melbourne.
          </h1>
          <p className="mx-auto mb-6 max-w-[560px] text-[17px] leading-[1.5] text-sparq-body">
            Browse real portfolios, read honest reviews, and book your next appointment in under two minutes.
          </p>

          {/* Mobile — 3 stacked rows + search button */}
          <form action="/search" method="GET" className="mx-auto mt-1 flex max-w-[420px] flex-col gap-2 md:hidden">
            <MobileRow label="Service" value="Any service" />
            <MobileRow label="Location" value="Melbourne, VIC" valueSet />
            <MobileRow label="Date" value="Any time" />
            <button type="submit" className="mt-0.5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-sparq-coral px-3.5 py-3.5 text-sm font-semibold text-white hover:bg-sparq-coral-dark">
              <Search className="h-3.5 w-3.5" aria-hidden="true" /> Search
            </button>
          </form>

          {/* Tablet / desktop — 3-segment pill */}
          <form
            action="/search"
            method="GET"
            className="mx-auto hidden w-full max-w-[800px] items-stretch rounded-full border border-sparq-border bg-white py-[5px] pl-0 pr-[5px] md:inline-flex lg:py-1.5"
          >
            <Segment label="Service" value="Any service" />
            <Segment label="Location" value="Melbourne, VIC" valueSet chevron={false} />
            <Segment label="Date" value="Any time" />
            <button
              type="submit"
              className="ml-1 flex h-[42px] flex-shrink-0 items-center gap-[7px] self-center rounded-full bg-sparq-coral px-[18px] text-sm font-semibold text-white hover:bg-sparq-coral-dark lg:h-[46px] lg:px-[22px]"
            >
              <Search className="h-[13px] w-[13px]" aria-hidden="true" /> Search
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
