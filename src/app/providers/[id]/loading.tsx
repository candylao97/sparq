/** Skeleton for /providers/[id] — mirrors providers-id-loading.html.
 *  Uses the repo's animate-pulse convention in place of the mock's
 *  custom shimmer sweep (visually equivalent, framework-consistent). */
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-sparq-surface-warm ${className}`} />
}

export default function Loading() {
  return (
    <div className="bg-white" aria-busy="true" aria-label="Loading artist profile">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        {/* Top bar */}
        <div className="py-3.5">
          <Sk className="h-3.5 w-[90px]" />
        </div>

        {/* Gallery */}
        <div className="grid h-[60vw] max-h-[420px] grid-cols-1 gap-0.5 overflow-hidden rounded-2xl md:h-[460px] md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 lg:h-[520px]">
          <Sk className="rounded-none md:row-span-2" />
          <Sk className="hidden rounded-none md:block" />
          <Sk className="hidden rounded-none md:block" />
          <Sk className="hidden rounded-none md:block" />
          <Sk className="hidden rounded-none md:block" />
        </div>

        {/* Two-column */}
        <div className="grid grid-cols-1 gap-0 py-6 lg:grid-cols-[1.7fr_1fr] lg:gap-12 lg:py-8">
          <div>
            {/* Header */}
            <div className="border-b border-sparq-border pb-5 pt-4">
              <Sk className="h-[30px] w-[220px]" />
              <Sk className="mt-3 h-3.5 w-[360px] max-w-full" />
              <Sk className="mt-4 h-3.5 w-[220px]" />
              <div className="mt-3.5 flex gap-1.5">
                <Sk className="h-[22px] w-20 rounded-full" />
                <Sk className="h-[22px] w-20 rounded-full" />
              </div>
            </div>
            {/* About */}
            <section className="border-b border-sparq-border py-7">
              <Sk className="mb-4 h-[22px] w-[140px]" />
              <Sk className="h-20 rounded-xl" />
            </section>
            {/* Services */}
            <section className="border-b border-sparq-border py-7">
              <Sk className="mb-4 h-[22px] w-[140px]" />
              <Sk className="mb-1.5 h-14" />
              <Sk className="mb-1.5 h-14" />
              <Sk className="h-14" />
            </section>
            {/* Portfolio */}
            <section className="border-b border-sparq-border py-7">
              <Sk className="mb-4 h-[22px] w-[140px]" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Sk key={i} className="aspect-square rounded-2xl" />
                ))}
              </div>
            </section>
            {/* Reviews */}
            <section className="py-7">
              <Sk className="mb-4 h-[22px] w-[140px]" />
              <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 md:gap-x-7">
                <Sk className="h-[120px] rounded-xl" />
                <Sk className="h-[120px] rounded-xl" />
              </div>
            </section>
          </div>

          {/* Booking sidebar */}
          <aside className="hidden lg:block">
            <div className="rounded-xl border border-sparq-border bg-white p-[22px]">
              <Sk className="mb-3.5 h-6 w-[70%]" />
              <Sk className="mb-2.5 h-14 rounded-[10px]" />
              <Sk className="mb-3 h-14 rounded-[10px]" />
              <Sk className="mt-3.5 h-12 rounded-[10px] bg-sparq-coral/20" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
