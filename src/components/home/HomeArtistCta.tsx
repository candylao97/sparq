import Link from 'next/link'

const TEXTURE =
  'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.16), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.16), transparent 55%)'

export function HomeArtistCta() {
  return (
    <section className="py-8 lg:py-12" aria-labelledby="artist-cta-heading">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-sparq-ink text-white md:min-h-[320px] md:grid-cols-[1.1fr_1fr] lg:min-h-[360px]">
          <div
            className="relative aspect-[16/10] md:aspect-auto md:h-full"
            style={{ backgroundImage: 'linear-gradient(140deg, #E8C3A6, #B87759 50%, #5C362A)' }}
          >
            <span className="absolute inset-0" style={{ background: TEXTURE }} aria-hidden="true" />
          </div>
          <div className="flex flex-col justify-center p-6 md:p-10 lg:p-14">
            <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-sparq-coral">For artists</div>
            <h2 id="artist-cta-heading" className="max-w-[440px] text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[32px] lg:text-[38px]">
              Earn from your craft. Keep your calendar full.
            </h2>
            <p className="my-3 max-w-[440px] text-sm leading-[1.55] text-white/70 md:my-4">
              Sparq is free to join, free to list, and takes a flat 15% only when you get booked. No subscriptions, no monthly fees, no premium tier you have to pay for.
            </p>
            <div className="flex items-center gap-2">
              <Link href="/register/provider" className="inline-block rounded-[10px] bg-sparq-coral px-[22px] py-3.5 text-sm font-semibold text-white hover:bg-sparq-coral-dark">
                Become an artist
              </Link>
              <Link href="/how-it-works/earn" className="hidden pl-2 text-sm text-white/85 md:inline">
                See how earnings work →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
