import Link from 'next/link'
import { Star, Heart } from 'lucide-react'

export type FeaturedArtist = {
  id: string | null
  name: string
  category: string
  blurb: string
  suburb: string
  rating: string
  price: number
  badge: 'Top-rated' | 'Verified' | 'New' | 'Featured'
  tone: number // 1–8 → gradient placeholder
}

/** Intentional gradient placeholders — the design ships real beauty
 *  photography in production (called out in the design's own notes). */
export const TONE_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(140deg, #F4D5C4, #D88368)',
  2: 'linear-gradient(140deg, #E8C3A6, #B87759)',
  3: 'linear-gradient(140deg, #F3E2D0, #C49878)',
  4: 'linear-gradient(140deg, #5C362A, #1F1108)',
  5: 'linear-gradient(140deg, #E2A487, #A03A1E)',
  6: 'linear-gradient(140deg, #F8E0D0, #BC7850)',
  7: 'linear-gradient(140deg, #D8B89F, #8C5A3E)',
  8: 'linear-gradient(140deg, #F2CCB6, #E96B56)',
}

const TEXTURE =
  'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.16), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.16), transparent 55%)'

function ArtistCard({ a }: { a: FeaturedArtist }) {
  return (
    <>
      <div className="relative aspect-square overflow-hidden rounded-2xl" style={{ backgroundImage: TONE_GRADIENTS[a.tone] }}>
        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${a.badge === 'Featured' ? 'bg-sparq-coral text-white' : 'bg-white'}`}>
          {a.badge}
        </span>
        <Heart className="absolute right-2.5 top-2.5 h-5 w-5 text-white/95 drop-shadow" aria-hidden="true" />
        <span className="absolute inset-0" style={{ background: TEXTURE }} aria-hidden="true" />
      </div>
      <div className="pt-2.5">
        <div className="flex items-baseline justify-between gap-1.5">
          <span className="text-[14px] font-semibold sm:text-[15px]">{a.name}</span>
          <span className="flex flex-shrink-0 items-center gap-[3px] text-[12px] font-medium tabular-nums sm:text-[13px]">
            <Star className="h-2.5 w-2.5 fill-sparq-ink text-sparq-ink" aria-hidden="true" />
            {a.rating}
          </span>
        </div>
        <div className="mt-px text-[12px] text-[#717171] sm:text-[13px]">
          {a.category}{a.blurb ? ` · ${a.blurb}` : ''}
        </div>
        {a.suburb && <div className="hidden text-[12px] text-[#717171] sm:block sm:text-[13px]">{a.suburb}</div>}
        <div className="mt-1 text-[13px] tabular-nums sm:text-[14px]">
          from <strong className="font-bold">${a.price}</strong>
        </div>
      </div>
    </>
  )
}

export function HomeFeatured({ artists }: { artists: FeaturedArtist[] }) {
  return (
    <section className="pb-4 pt-6 md:pb-6 md:pt-8 lg:pb-8 lg:pt-10" aria-labelledby="featured-heading">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="mb-5 flex items-end justify-between gap-4 lg:mb-6">
          <div>
            <h2 id="featured-heading" className="text-[22px] font-bold tracking-[-0.02em] md:text-[26px] lg:text-[28px]">
              Featured this week
            </h2>
            <p className="hidden text-sm text-[#717171] lg:block">
              Verified artists with availability in the next 7 days
            </p>
          </div>
          <Link href="/search" className="flex-shrink-0 border-b border-sparq-ink pb-0.5 text-[13px] font-semibold">
            View all
          </Link>
        </div>

        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-[18px] xl:gap-y-6">
          {artists.map((a, i) => {
            const cls = 'w-[220px] flex-none snap-start sm:w-auto'
            return a.id ? (
              <Link key={a.id} href={`/providers/${a.id}`} className={cls}>
                <ArtistCard a={a} />
              </Link>
            ) : (
              <div key={`${a.name}-${i}`} className={cls}>
                <ArtistCard a={a} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
