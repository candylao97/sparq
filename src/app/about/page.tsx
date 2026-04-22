import Link from 'next/link'
import { Users, Sparkles, Globe } from 'lucide-react'

const VALUES = [
  {
    icon: Users,
    label: 'For clients',
    heading: 'Beauty, on your schedule.',
    body: 'Browse hundreds of verified artists, read real reviews, and book the perfect appointment — without the back-and-forth. Every booking is covered by Sparq\'s guarantee.',
    bg: 'bg-[#fdf3f1]',
    iconColor: 'text-[#E96B56]',
    iconBg: 'bg-[#fdf3f1]',
  },
  {
    icon: Sparkles,
    label: 'For artists',
    heading: 'Your talent, your business.',
    body: 'Set your own prices, manage your calendar, and grow a loyal client base. Sparq handles payments, bookings, and marketing — so you can focus on your craft.',
    bg: 'bg-[#f5f0ff]',
    iconColor: 'text-[#8b5cf6]',
    iconBg: 'bg-[#f5f0ff]',
  },
  {
    icon: Globe,
    label: 'For everyone',
    heading: 'A community worth being part of.',
    body: 'Sparq is built on trust, transparency, and genuine connection. We\u2019re here to raise the standard — for clients who deserve great experiences, and artists who deserve to thrive.',
    bg: 'bg-[#eff6ff]',
    iconColor: 'text-[#4f8ef7]',
    iconBg: 'bg-[#eff6ff]',
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e1de] pt-16 pb-14 md:pt-24 md:pb-20 text-center">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E96B56] mb-5">
            Our story
          </p>
          <h1 className="font-headline text-[2.75rem] md:text-[3.75rem] text-[#1A1A1A] leading-[1.08] mb-5">
            Beauty, on your terms.
          </h1>
          <p className="text-base md:text-lg text-[#717171] leading-relaxed max-w-lg mx-auto">
            Sparq was built to give every nail and lash artist a platform to showcase their work — and every client a smarter way to book.
          </p>
        </div>
      </section>

      {/* ─── Origin ───────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="max-w-2xl mx-auto space-y-5 text-base text-[#717171] leading-relaxed text-left">
            <p>
              We started Sparq after hearing the same frustration from artists across Sydney: talented, hardworking professionals with full skill sets and zero tools to match with the right clients. Meanwhile, clients were scrolling through Instagram DMs, chasing quotes, and hoping for the best.
            </p>
            <p>
              We believed there had to be a better way — one that respects both sides. A platform that feels premium, moves fast, and puts trust at the centre of every interaction.
            </p>
            <p className="font-medium text-[#1A1A1A] text-left">
              That&apos;s Sparq. Australia&apos;s curated beauty and lifestyle marketplace.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Value cards ──────────────────────────────────────────────────── */}
      <section className="border-t border-[#e8e1de] bg-white py-14 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#717171] mb-2">
              What we stand for
            </p>
            <h2 className="font-headline text-2xl md:text-3xl text-[#1A1A1A]">
              Built for both sides of the booking.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {VALUES.map(v => {
              const Icon = v.icon
              return (
                <div
                  key={v.label}
                  className="bg-white rounded-2xl border border-[#e8e1de] p-7 hover:shadow-sm transition-shadow duration-200"
                >
                  <div className={`w-11 h-11 ${v.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                    <Icon className={`w-5 h-5 ${v.iconColor}`} />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#717171] mb-2">
                    {v.label}
                  </p>
                  <h3 className="font-headline text-xl text-[#1A1A1A] mb-3 leading-snug">
                    {v.heading}
                  </h3>
                  <p className="text-sm text-[#717171] leading-relaxed">
                    {v.body}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 text-center">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <h2 className="font-headline text-2xl md:text-3xl text-[#1A1A1A] mb-4">
            Ready to find your Sparq?
          </h2>
          <p className="text-sm text-[#717171] mb-8 leading-relaxed">
            Join thousands of clients and artists across Australia who are already doing beauty differently.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#E96B56] to-[#C95444] px-7 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              Browse artists
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full border border-[#1A1A1A]/20 px-7 py-3.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors w-full sm:w-auto"
            >
              Share your Sparq
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Closing bar ──────────────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A] py-12 text-center">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <p className="font-headline text-xl md:text-2xl text-white leading-snug">
            Every talent has one.
          </p>
          <p className="text-sm text-white/50 mt-2">
            Sparq — Australia&apos;s beauty &amp; lifestyle marketplace.
          </p>
        </div>
      </section>

    </main>
  )
}
