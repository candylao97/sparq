import Link from 'next/link'
import { MapPin, Star, Users } from 'lucide-react'
import { HomeNav } from '@/components/home/HomeNav'
import { HomeFooter } from '@/components/home/HomeFooter'

export const metadata = {
  title: 'About | Sparq',
  description:
    "Sparq is Australia's curated beauty and lifestyle marketplace — built to give every nail and lash artist a platform, and every client a smarter way to book.",
}

const PILLARS = [
  {
    icon: MapPin,
    who: 'For clients',
    title: 'Beauty, on your schedule.',
    body: "Browse hundreds of verified artists, read real reviews, and book the perfect appointment — without the back-and-forth. Every booking is covered by Sparq's guarantee.",
  },
  {
    icon: Star,
    who: 'For artists',
    title: 'Your talent, your business.',
    body: 'Set your own prices, manage your calendar, and grow a loyal client base. Sparq handles payments, bookings, and marketing — so you can focus on your craft.',
  },
  {
    icon: Users,
    who: 'For everyone',
    title: 'A community worth being part of.',
    body: "Sparq is built on trust, transparency, and genuine connection. We're here to raise the standard — for clients who deserve great experiences, and artists who deserve to thrive.",
  },
]

export default function AboutPage() {
  return (
    <div className="bg-white text-sparq-ink">
      <HomeNav />

      {/* Hero */}
      <section className="mx-auto w-full max-w-[1120px] px-6 py-24 text-center md:px-10 md:py-32">
        <span className="mb-6 inline-block rounded-full bg-sparq-surface-warm px-3.5 py-1.5 text-[13px] font-semibold text-sparq-body">
          Our story
        </span>
        <h1 className="mx-auto mb-5 max-w-[16ch] text-[clamp(40px,6vw,72px)] font-bold leading-[1.05] tracking-[-0.025em]">
          Beauty, on <span className="text-sparq-coral">your terms.</span>
        </h1>
        <p className="mx-auto max-w-[580px] text-[18px] leading-[1.5] text-sparq-body">
          Sparq was built to give every nail and lash artist a platform to showcase their work — and every client a smarter way to book.
        </p>
      </section>

      {/* Story */}
      <section className="border-t border-sparq-border">
        <div className="mx-auto w-full max-w-[720px] px-6 py-24 md:px-10 md:py-32">
          <h2 className="mb-9 text-center text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.1] tracking-[-0.02em]">
            How Sparq began.
          </h2>
          <div className="space-y-5 text-[17px] leading-[1.7] text-sparq-body">
            <p>
              We started Sparq after hearing the same frustration from artists across Sydney: talented, hardworking professionals with full skill sets and zero tools to match with the right clients. Meanwhile, clients were scrolling through Instagram DMs, chasing quotes, and hoping for the best.
            </p>
            <p>
              We believed there had to be <strong className="font-semibold text-sparq-ink">a better way</strong> — one that respects both sides. A platform that feels premium, moves fast, and puts trust at the centre of every interaction.
            </p>
            <p>
              That&apos;s Sparq. <strong className="font-semibold text-sparq-ink">Australia&apos;s curated beauty and lifestyle marketplace.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Image band */}
      <section className="mx-auto w-full max-w-[1120px] px-6 pb-24 md:px-10 md:pb-32">
        <div
          className="relative aspect-[16/7] overflow-hidden rounded-[20px]"
          style={{ background: 'linear-gradient(135deg, #FBE2D4 0%, #E96B56 55%, #A63A29 100%)' }}
          aria-hidden="true"
        >
          <span
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 25% 30%, rgba(255,255,255,0.25) 0%, transparent 60%),' +
                'radial-gradient(ellipse 50% 40% at 80% 80%, rgba(0,0,0,0.20) 0%, transparent 60%)',
            }}
          />
        </div>
      </section>

      {/* What we stand for */}
      <section className="border-t border-sparq-border">
        <div className="mx-auto w-full max-w-[1120px] px-6 py-24 md:px-10 md:py-32">
          <header className="mb-16 text-center">
            <h2 className="mb-4 text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.1] tracking-[-0.02em]">
              What we stand for.
            </h2>
            <p className="mx-auto max-w-[480px] text-[17px] text-[#717171]">Built for both sides of the booking.</p>
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {PILLARS.map(({ icon: Icon, who, title, body }) => (
              <article key={who} className="flex min-h-[280px] flex-col gap-3.5 rounded-2xl bg-sparq-surface-warm p-7">
                <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sparq-coral">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                </span>
                <span className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[#717171]">{who}</span>
                <h3 className="text-[22px] font-bold leading-[1.2] tracking-[-0.015em]">{title}</h3>
                <p className="text-[15px] leading-[1.55] text-sparq-body">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-sparq-border">
        <div className="mx-auto w-full max-w-[1120px] px-6 py-24 text-center md:px-10 md:py-36">
          <h2 className="mx-auto mb-4 max-w-[18ch] text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.1] tracking-[-0.02em]">
            Find your <span className="text-sparq-coral">perfect match.</span>
          </h2>
          <p className="mx-auto mb-8 max-w-[480px] text-[17px] text-[#717171]">
            Whether you&apos;re booking your next appointment or applying as an artist — start where you belong.
          </p>
          <div className="inline-flex flex-wrap justify-center gap-3">
            <Link href="/search" className="inline-flex items-center gap-2 rounded-full bg-sparq-coral px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-sparq-coral-dark">
              Find an artist
            </Link>
            <Link href="/register/provider" className="inline-flex items-center gap-2 rounded-full border border-sparq-ink bg-white px-6 py-3.5 text-[15px] font-semibold hover:bg-sparq-ink hover:text-white">
              Apply as an artist
            </Link>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  )
}
