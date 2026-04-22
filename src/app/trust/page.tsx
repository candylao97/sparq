import Link from 'next/link'
import {
  Shield,
  Star,
  Lock,
  Sparkles,
  CheckCircle,
  MessageCircle,
  Mail,
  UserCheck,
  CalendarX,
  BadgeCheck,
  Wallet,
  SlidersHorizontal,
  EyeOff,
  HeartHandshake,
} from 'lucide-react'

// ─── Trust pillars ────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: UserCheck,
    title: 'Verified artists',
    body: 'Every artist passes identity verification before accepting their first booking. Verified profiles show a badge — so you always know who you\'re booking.',
    color: 'text-[#E96B56]',
    bg: 'bg-[#fdf3f1]',
  },
  {
    icon: Star,
    title: 'Real reviews',
    body: 'Reviews are only left after a completed booking. No fake stars — every rating reflects a genuine client experience.',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#fffbeb]',
  },
  {
    icon: Lock,
    title: 'Secure payments',
    body: 'All payments are processed through Stripe. Your card details are never stored on our servers — only released once your appointment is complete.',
    color: 'text-[#4f8ef7]',
    bg: 'bg-[#eff6ff]',
  },
  {
    icon: Sparkles,
    title: 'Hygiene standards',
    body: 'Artists agree to maintain professional hygiene standards as part of joining Sparq. Any concern can be reported directly to our team.',
    color: 'text-[#8b5cf6]',
    bg: 'bg-[#f5f0ff]',
  },
]

// ─── For clients ──────────────────────────────────────────────────────────────

const CLIENT_POINTS = [
  {
    icon: CalendarX,
    title: 'Free cancellation',
    body: 'Cancel up to 24 hours before your appointment at no cost.',
  },
  {
    icon: Lock,
    title: 'Held — not charged',
    body: 'Your card is held at booking, but only charged after your appointment is confirmed complete.',
  },
  {
    icon: Shield,
    title: 'No-show protection',
    body: 'If your artist doesn\'t show, contact support for a full refund — no questions asked.',
  },
  {
    icon: HeartHandshake,
    title: 'Dispute resolution',
    body: 'Something went wrong? Our team reviews every dispute fairly and quickly.',
  },
]

// ─── For artists ──────────────────────────────────────────────────────────────

const ARTIST_POINTS = [
  {
    icon: SlidersHorizontal,
    title: 'You set the rules',
    body: 'Your prices, availability, and service list are always yours to control.',
  },
  {
    icon: EyeOff,
    title: 'Privacy first',
    body: 'Clients only see what you choose to share. Your personal details stay protected.',
  },
  {
    icon: Wallet,
    title: 'Payments on time',
    body: 'Earnings are transferred to your bank 2–3 business days after each completed appointment.',
  },
  {
    icon: BadgeCheck,
    title: 'Backed by our team',
    body: 'In any dispute, our Trust & Safety team reviews both sides carefully before any decision.',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e1de] pt-16 pb-14 md:pt-24 md:pb-16 text-center">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="inline-flex items-center gap-2 bg-[#fdf3f1] border border-[#E96B56]/20 text-[#E96B56] text-[11px] font-semibold uppercase tracking-[0.22em] px-4 py-2 rounded-full mb-6">
            <Shield className="w-3.5 h-3.5" />
            Trust &amp; Safety
          </div>
          <h1 className="font-headline text-[2.75rem] md:text-[3.5rem] text-[#1A1A1A] leading-[1.1] mb-4">
            Your safety,<br />our priority.
          </h1>
          <p className="text-base md:text-lg text-[#717171] leading-relaxed max-w-md mx-auto">
            Every booking on Sparq is built on verified artists, honest reviews, and secure payments — so you can focus on what matters.
          </p>
        </div>
      </section>

      {/* ─── Trust pillars ─────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">

          <div className="text-center mb-10">
            <p className="section-label mb-2">Built in from day one</p>
            <h2 className="font-headline text-2xl md:text-3xl text-[#1A1A1A]">
              Four things we never compromise on
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PILLARS.map(pillar => {
              const Icon = pillar.icon
              return (
                <div
                  key={pillar.title}
                  className="bg-white rounded-2xl border border-[#e8e1de] p-6 hover:shadow-sm transition-shadow duration-200"
                >
                  <div className={`w-10 h-10 ${pillar.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${pillar.color}`} />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] text-base mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[#717171] leading-relaxed">
                    {pillar.body}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── For clients + For artists ─────────────────────────────────────── */}
      <section className="border-y border-[#e8e1de] bg-white py-14 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="relative grid md:grid-cols-2 gap-10 md:gap-14">

            {/* For clients */}
            <div>
              <p className="section-label mb-3">For clients</p>
              <h2 className="font-headline text-2xl text-[#1A1A1A] mb-6">
                You&apos;re covered, every step.
              </h2>
              <div className="space-y-5">
                {CLIENT_POINTS.map(point => {
                  const Icon = point.icon
                  return (
                    <div key={point.title} className="flex items-start gap-3.5">
                      <div className="w-8 h-8 bg-[#fdf3f1] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-[#E96B56]" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#1A1A1A] mb-0.5">
                          {point.title}
                        </p>
                        <p className="text-sm text-[#717171] leading-relaxed">
                          {point.body}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider — vertical on desktop only */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-[#e8e1de]" aria-hidden />

            {/* For artists */}
            <div>
              <p className="section-label mb-3">For artists</p>
              <h2 className="font-headline text-2xl text-[#1A1A1A] mb-6">
                Your work, your terms.
              </h2>
              <div className="space-y-5">
                {ARTIST_POINTS.map(point => {
                  const Icon = point.icon
                  return (
                    <div key={point.title} className="flex items-start gap-3.5">
                      <div className="w-8 h-8 bg-[#f5f0ff] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-[#8b5cf6]" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#1A1A1A] mb-0.5">
                          {point.title}
                        </p>
                        <p className="text-sm text-[#717171] leading-relaxed">
                          {point.body}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Trust checklist strip ─────────────────────────────────────────── */}
      <section className="py-10 border-b border-[#e8e1de]">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {[
              'Identity-verified artists',
              'Stripe-secured payments',
              'Reviews from real bookings only',
              'Free cancellation up to 24 hours',
              'No-show refund guarantee',
            ].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#1a9e6f] flex-shrink-0" />
                <span className="text-sm text-[#717171]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Support ───────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="bg-[#f9f2ef] rounded-3xl border border-[#e8e1de] px-8 py-10 md:px-12 md:py-12 text-center">
            <p className="section-label mb-3">Need help?</p>
            <h2 className="font-headline text-2xl md:text-3xl text-[#1A1A1A] mb-3">
              We&apos;re here when something feels off.
            </h2>
            <p className="text-sm text-[#717171] leading-relaxed max-w-md mx-auto mb-8">
              Our team reviews every concern — whether it&apos;s a payment question, a no-show, or a safety issue. No concern is too small.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-6 py-3 text-sm font-semibold text-white hover:bg-[#d45a45] transition-colors w-full sm:w-auto justify-center"
              >
                <MessageCircle className="h-4 w-4" />
                Chat with Sparq AI
              </Link>
              <a
                href="mailto:hello@sparq.com.au"
                className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/20 px-6 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors w-full sm:w-auto justify-center"
              >
                <Mail className="h-4 w-4" />
                Email us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Re-engagement ─────────────────────────────────────────────────── */}
      <div className="pb-4 text-center">
        <p className="text-sm text-[#8A8A8A]">
          Feel confident?{' '}
          <Link href="/search" className="font-semibold text-[#E96B56] hover:underline underline-offset-4">
            Browse artists →
          </Link>
        </p>
      </div>

      {/* ─── Closing statement ─────────────────────────────────────────────── */}
      <section className="bg-[#1A1A1A] py-12 text-center">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <p className="font-headline text-xl md:text-2xl text-white leading-snug">
            We built Sparq on trust — and we work every day to keep it.
          </p>
          <p className="text-sm text-white/50 mt-3">
            Safety isn&apos;t a feature on Sparq. It&apos;s the foundation.
          </p>
        </div>
      </section>

    </main>
  )
}
