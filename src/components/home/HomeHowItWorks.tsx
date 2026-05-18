const STEPS = [
  { n: 1, t: 'Browse', d: 'Verified Melbourne artists across Nails, Lashes & Makeup. Filter by suburb, service, date, or price.' },
  { n: 2, t: 'Book', d: 'Pick a service and a time slot. Pay securely with Stripe. Your artist confirms within an hour.' },
  { n: 3, t: 'Enjoy', d: 'Show up, get done. Leave a review afterwards — your feedback shapes who else discovers them.' },
] as const

export function HomeHowItWorks() {
  return (
    <section className="mt-5 bg-sparq-surface-warm py-10 md:mt-8 md:py-16" aria-labelledby="how-heading">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="mb-5 md:mb-7 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <h2 id="how-heading" className="text-[26px] font-bold tracking-[-0.02em] md:text-[32px] lg:max-w-[460px]">
            How Sparq works
          </h2>
          <p className="mt-2 max-w-[480px] text-sm leading-[1.55] text-[#717171] lg:mt-0">
            From scrolling portfolios to sitting in the chair — under two minutes, no DMs, no hold music.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-sparq-border bg-white p-[22px] md:p-7">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-sparq-coral-light text-[13px] font-bold tabular-nums text-sparq-coral-dark">
                {s.n}
              </div>
              <h3 className="mb-1.5 text-[18px] font-bold tracking-[-0.015em] md:text-[20px]">{s.t}</h3>
              <p className="text-[13.5px] leading-[1.55] text-[#717171]">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
