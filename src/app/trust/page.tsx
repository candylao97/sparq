import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle,
  CreditCard,
  FileText,
  Lock,
  MessageSquare,
  Shield,
  Star,
  UserCheck,
} from 'lucide-react'

const HELP_TOPICS = [
  {
    icon: CalendarDays,
    title: 'Booking changes',
    description: 'Reschedule an appointment, check timing, or understand what happens when an artist cancels.',
    points: [
      'Use your booking page to check the latest appointment details',
      'If an artist cancels, support can help you rebook quickly',
      'Booking numbers make changes faster but are optional',
    ],
  },
  {
    icon: CreditCard,
    title: 'Refunds and payments',
    description: 'Understand when you are charged, what is held securely, and when refunds apply.',
    points: [
      'Payments are processed securely through Stripe',
      'Artist no-shows are eligible for a full refund',
      'Disputes are reviewed by support within 48 hours',
    ],
  },
  {
    icon: Shield,
    title: 'Trust and safety',
    description: 'See how artist verification, reviews, and support work before and after a booking.',
    points: [
      'Artists are identity-verified before taking bookings',
      'Reviews come from completed bookings only',
      'Safety concerns can be reported confidentially',
    ],
  },
]

const QUICK_ANSWERS = [
  {
    question: 'How do I get help fastest?',
    answer:
      'Start with the AI support assistant. Share your name, email, and what happened. If you have a booking number, include it. The assistant prepares a cleaner support request for follow-up.',
  },
  {
    question: 'What happens if my artist doesn\'t show up?',
    answer:
      'If your artist doesn\'t show up for a confirmed booking, you can contact support through the AI assistant. No-show bookings are eligible for a full refund.',
  },
  {
    question: 'Can I trust the reviews on Sparq?',
    answer:
      'Yes. Reviews are tied to completed bookings, so clients only review artists they actually booked through the platform.',
  },
  {
    question: 'How are payments protected?',
    answer:
      'All payments are processed through Stripe. Card details are handled securely, and support can step in if there is a booking dispute.',
  },
]

const TRUST_SIGNALS = [
  { icon: Lock, label: 'Stripe-secured payments' },
  { icon: UserCheck, label: 'Identity-verified artists' },
  { icon: Star, label: 'Verified reviews only' },
  { icon: CheckCircle, label: 'Sparq Guarantee' },
]

const SUPPORT_PATHS = [
  {
    icon: MessageSquare,
    title: 'General support',
    description: 'Best for booking changes, refunds, account access, payment questions, or artist issues.',
    cta: 'Open AI support',
    href: '/contact',
  },
  {
    icon: AlertCircle,
    title: 'Safety concern',
    description: 'Use this path if something happened during a booking that needs urgent review by Trust & Safety.',
    cta: 'Report a concern',
    href: '/contact',
  },
  {
    icon: FileText,
    title: 'Community rules',
    description: 'Read the standards for clients and artists, and how Sparq handles reports and enforcement.',
    cta: 'Read community policy',
    href: '/community',
  },
]

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <section className="border-b border-white/10 bg-[#1A1A1A] text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#E96B56]">Help Centre</p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Help that is easier to scan, trust, and act on
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            Find quick answers about bookings, refunds, payments, and safety, then jump straight into support if you need help with a real issue.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            {TRUST_SIGNALS.map(item => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-slate-300">
                <item.icon size={15} className="text-[#E96B56]" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a63a29]">Start here</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1A1A1A]">Most common help topics</h2>
          </div>
          <Link
            href="/contact"
            className="hidden rounded-full border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef] md:inline-flex"
          >
            Contact support
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {HELP_TOPICS.map(topic => (
            <div key={topic.title} className="rounded-[28px] border border-[#e8e1de] bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7f1e3]">
                <topic.icon className="text-[#a63a29]" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A1A]">{topic.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#717171]">{topic.description}</p>
              <ul className="mt-5 space-y-3">
                {topic.points.map(point => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span className="text-sm text-[#717171]">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#e8e1de]/80 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14 lg:px-10">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a63a29]">Quick answers</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1A1A1A]">Short answers to the questions people ask most</h2>
          </div>

          <div className="space-y-4">
            {QUICK_ANSWERS.map(item => (
              <div key={item.question} className="rounded-[24px] border border-[#e8e1de] bg-[#f9f2ef] px-5 py-5">
                <h3 className="text-base font-semibold text-[#1A1A1A]">{item.question}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#717171]">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a63a29]">Need action?</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#1A1A1A]">Choose the right support path</h2>
          <p className="mt-2 text-sm leading-6 text-[#717171]">
            The fastest route depends on the type of issue. These paths keep support clearer for you and easier for our team to review.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {SUPPORT_PATHS.map(path => (
            <Link
              key={path.title}
              href={path.href}
              className="group rounded-[28px] border border-[#e8e1de] bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1A1A]/6">
                <path.icon className="text-[#1A1A1A]" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A1A]">{path.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#717171]">{path.description}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
                {path.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[#e8e1de]/80 bg-[#1A1A1A] text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 py-14 lg:flex-row lg:items-center lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E96B56]">Still need help?</p>
            <h2 className="mt-2 text-2xl font-semibold">Start with the AI support assistant</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              It helps collect the right details, explains what to do next, and prepares a cleaner support request for follow-up.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#f3ece9]"
          >
            Open support
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
