import Link from 'next/link'
import {
  ArrowRight, CalendarCheck, BadgeCheck, Banknote,
  MapPin, SlidersHorizontal, ShieldCheck, Clock,
  Lock, UserCheck, LifeBuoy, Umbrella,
} from 'lucide-react'
import { FaqAccordion } from './FaqAccordion'

// ── Static data ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    icon: BadgeCheck,
    title: 'Set up in minutes',
    outcome: 'Most artists go live in under 10 minutes',
    body: 'Add your services, set your prices, and upload a few portfolio photos. No paperwork, no approval wait.',
    highlight: false,
  },
  {
    n: '02',
    icon: CalendarCheck,
    title: 'Clients come to you',
    outcome: 'No pitching. No chasing leads.',
    body: 'Your profile appears in local searches. Clients read your reviews and book directly — you just show up and do the work you love.',
    highlight: true,
  },
  {
    n: '03',
    icon: Banknote,
    title: 'Get paid, automatically',
    outcome: 'Money in your account within 1–2 days',
    body: 'Sparq holds client payment before every appointment and releases it to you automatically once it\'s complete.',
    highlight: false,
  },
]

const BENEFITS = [
  {
    icon: SlidersHorizontal,
    title: 'Name your price',
    body: 'Set exactly what your services are worth. Raise your rates, run promotions — it\'s your business, your call.',
  },
  {
    icon: MapPin,
    title: 'Work your way',
    body: 'Home visits, your studio, or both. You choose where every appointment happens — and you can change it any time.',
  },
  {
    icon: Clock,
    title: 'Total schedule control',
    body: 'Open your calendar when you want bookings. Close it just as easily. No minimums, no lock-in, no pressure.',
  },
  {
    icon: Umbrella,
    title: 'You\'re protected',
    body: 'Every booking includes payment protection and dispute support. We also connect you with public liability insurance — so you\'re covered from day one.',
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StartEarningPage() {
  return (
    <div className="bg-white">

      {/* ─── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A] min-h-screen flex items-center px-6">
        <div className="mx-auto max-w-3xl text-center w-full">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E96B56]">
            For nail &amp; lash artists
          </p>
          <h1 className="font-headline text-[2.8rem] md:text-[4.2rem] lg:text-[5rem] leading-[1.05] tracking-[-0.02em] text-[#FDFBF7] mb-6">
            Do what you love.
            <br />
            <span className="italic text-[#E96B56]">Earn what you&rsquo;re worth.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-[#FDFBF7]/60 leading-[1.7]">
            Set your own prices. Choose your own hours. Work with the confidence that Sparq has your back — every booking, every time.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <Link
              href="/register/provider"
              className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-[#d45a45] shadow-lg shadow-[#E96B56]/20"
            >
              Start earning — it&rsquo;s free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-[#FDFBF7]/20 px-8 py-4 text-base font-semibold text-[#FDFBF7]/70 transition-colors hover:border-[#FDFBF7]/40 hover:text-[#FDFBF7]"
            >
              See how it works
            </Link>
          </div>

          {/* Trust badge strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { icon: Lock,      label: 'Secure payments'  },
              { icon: LifeBuoy,  label: 'Dispute support'  },
              { icon: UserCheck, label: 'Verified clients' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-[#FDFBF7]/40">
                <Icon className="h-3.5 w-3.5 text-[#FDFBF7]/30" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2. How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works">
        <div className="px-6 sm:px-10 lg:px-16 xl:px-24 py-20 md:py-28">
          <div className="mb-14 text-center">
            <p className="section-label mb-3">Simple by design</p>
            <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
              Start earning in 3 simple steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map(({ n, icon: Icon, title, outcome, body, highlight }) =>
              highlight ? (
                /* ── Highlighted step (02) ── */
                <div
                  key={n}
                  className="rounded-2xl bg-[#1A1A1A] p-8 relative overflow-hidden"
                >
                  {/* Subtle coral glow */}
                  <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#E96B56]/10 blur-2xl pointer-events-none" />
                  <div className="mb-6 flex items-center justify-between relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E96B56]/15">
                      <Icon className="h-5 w-5 text-[#E96B56]" />
                    </div>
                    <span className="font-headline text-[2.2rem] text-[#FDFBF7]/10 leading-none">{n}</span>
                  </div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E96B56]">{outcome}</p>
                  <h3 className="mb-2 font-semibold text-[#FDFBF7] text-lg">{title}</h3>
                  <p className="text-sm text-[#FDFBF7]/50 leading-relaxed">{body}</p>
                </div>
              ) : (
                /* ── Regular step ── */
                <div
                  key={n}
                  className="rounded-2xl bg-white border border-[#e8e1de] p-8"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf3f1]">
                      <Icon className="h-5 w-5 text-[#E96B56]" />
                    </div>
                    <span className="font-headline text-[2.2rem] text-[#e8e1de] leading-none">{n}</span>
                  </div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E96B56]">{outcome}</p>
                  <h3 className="mb-2 font-semibold text-[#1A1A1A] text-lg">{title}</h3>
                  <p className="text-sm text-[#717171] leading-relaxed">{body}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ─── CTA #1 ──────────────────────────────────────────────────────── */}
      <section className="bg-[#E96B56] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
            Ready?
          </p>
          <h2 className="font-headline text-3xl md:text-[2.6rem] text-white leading-[1.1] mb-6">
            Start earning today
          </h2>
          <Link
            href="/register/provider"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#E96B56] transition-colors hover:bg-[#fdf3f1] shadow-lg"
          >
            Start earning
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm text-white/50">
            Free to join &middot; No lock-in &middot; Live in under 10 minutes
          </p>
        </div>
      </section>

      {/* ─── 3. Benefits ─────────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e1de] bg-white">
        <div className="px-6 sm:px-10 lg:px-16 xl:px-24 py-20 md:py-28">
          <div className="mb-14 text-center">
            <p className="section-label mb-3">Why artists choose Sparq</p>
            <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A] leading-[1.1]">
              Your business. Your rules.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white border border-[#e8e1de] p-7">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-[#e8e1de]">
                  <Icon className="h-5 w-5 text-[#E96B56]" />
                </div>
                <h3 className="mb-2 font-semibold text-[#1A1A1A]">{title}</h3>
                <p className="text-sm text-[#717171] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA #2 ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label mb-4">Ready when you are</p>
          <h2 className="font-headline text-3xl md:text-[2.8rem] text-[#1A1A1A] leading-[1.1] mb-4">
            Start earning today
          </h2>
          <p className="text-base text-[#717171] leading-relaxed mb-10 max-w-lg mx-auto">
            Join in minutes. No upfront cost. No lock-in. Start taking bookings as soon as your profile is live.
          </p>
          <Link
            href="/register/provider"
            className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-[#d45a45] shadow-lg shadow-[#E96B56]/20"
          >
            Start earning — it&rsquo;s free
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Trust micro-badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { icon: Lock,        label: 'Secure payments'    },
              { icon: LifeBuoy,    label: 'Dispute support'    },
              { icon: ShieldCheck, label: 'Artist protections' },
              { icon: UserCheck,   label: 'Verified clients'   },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-[#717171]">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>

          <p className="mt-4 text-xs text-[#717171]">
            No credit card required &middot; Profile live in under 10 minutes
          </p>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#e8e1de] bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <p className="section-label mb-3">Common questions</p>
            <h2 className="font-headline text-2xl md:text-3xl text-[#1A1A1A] leading-[1.1]">
              Everything you need to know
            </h2>
          </div>
          <FaqAccordion />
          <div className="mt-10 text-center">
            <p className="text-sm text-[#717171]">
              Still have questions?{' '}
              <Link href="/contact" className="font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#E96B56] transition-colors">
                Talk to us
              </Link>
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
