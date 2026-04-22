'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Calendar,
  CreditCard,
  Sparkles,
  Search,
  X,
  MessageCircle,
  Mail,
  ArrowRight,
} from 'lucide-react'

// ─── Flat Q&A data ─────────────────────────────────────────────────────────────
// Single source of truth — no accordion nesting needed in search-first model

const ALL_QA = [
  // Booking
  {
    id: 'b1',
    category: 'booking',
    categoryLabel: 'Booking',
    q: 'How do I book an appointment?',
    a: "Find an artist you like, choose your service, pick a date and time, and confirm. You'll receive an instant booking confirmation by email.",
    popular: true,
  },
  {
    id: 'b2',
    category: 'booking',
    categoryLabel: 'Booking',
    q: 'Can I choose a specific date and time?',
    a: "Yes. Each artist shows their live availability — only the slots they've marked open can be booked.",
    popular: false,
  },
  {
    id: 'b3',
    category: 'booking',
    categoryLabel: 'Booking',
    q: "What's the difference between at-home and studio services?",
    a: 'At-home: your artist travels to you. Studio: you visit their workspace. You can filter by either on the search page before booking.',
    popular: false,
  },
  {
    id: 'b4',
    category: 'booking',
    categoryLabel: 'Booking',
    q: 'Can I book same-day?',
    a: 'Yes, if the artist has same-day availability open. Look for the "Available today" indicator on their profile.',
    popular: true,
  },
  {
    id: 'b5',
    category: 'booking',
    categoryLabel: 'Booking',
    q: 'How do I know the artist is verified?',
    a: 'Every artist passes identity verification before accepting their first booking. Verified artists display a badge on their profile.',
    popular: false,
  },
  // Payments
  {
    id: 'p1',
    category: 'payments',
    categoryLabel: 'Payments',
    q: 'How does payment work?',
    a: 'You pay securely at the time of booking through Stripe. The artist receives their payment after your appointment is complete.',
    popular: false,
  },
  {
    id: 'p2',
    category: 'payments',
    categoryLabel: 'Payments',
    q: 'When am I charged?',
    a: 'Your card is held at booking but only charged once your appointment is confirmed complete — not before.',
    popular: true,
  },
  {
    id: 'p3',
    category: 'payments',
    categoryLabel: 'Payments',
    q: "What's the cancellation policy?",
    a: 'Cancel for free up to 24 hours before your appointment. Cancellations within 24 hours may incur a fee — always shown upfront before you confirm.',
    popular: true,
  },
  {
    id: 'p4',
    category: 'payments',
    categoryLabel: 'Payments',
    q: 'Can I get a refund?',
    a: 'If you cancel in time, your hold is released immediately. If something goes wrong, our team reviews disputes fairly and quickly.',
    popular: false,
  },
  {
    id: 'p5',
    category: 'payments',
    categoryLabel: 'Payments',
    q: 'Is my payment information secure?',
    a: 'Yes. All payments are processed by Stripe — we never store your full card details on our servers.',
    popular: false,
  },
  // Artists
  {
    id: 'a1',
    category: 'artists',
    categoryLabel: 'For artists',
    q: 'How do I join Sparq as an artist?',
    a: 'Sign up at sparq.com.au/register, build your profile, upload portfolio photos, and add your services. Most artists are ready to accept bookings within 24 hours.',
    popular: true,
  },
  {
    id: 'a2',
    category: 'artists',
    categoryLabel: 'For artists',
    q: 'How and when do I get paid?',
    a: 'Payments are transferred to your nominated bank account 2–3 business days after each completed appointment.',
    popular: true,
  },
  {
    id: 'a3',
    category: 'artists',
    categoryLabel: 'For artists',
    q: 'Can I set my own prices?',
    a: 'Absolutely. You control your prices, availability, and service offerings — update them anytime from your dashboard.',
    popular: false,
  },
  {
    id: 'a4',
    category: 'artists',
    categoryLabel: 'For artists',
    q: 'Can I work from home or travel to clients?',
    a: 'Yes to both. List yourself as mobile (you travel to clients), studio-based, or offer both options — your choice.',
    popular: false,
  },
  {
    id: 'a5',
    category: 'artists',
    categoryLabel: 'For artists',
    q: 'Do I need to be certified?',
    a: 'No formal certification is required. A strong portfolio and good reviews are what matter most to clients on Sparq.',
    popular: false,
  },
]

// Category metadata
const CATEGORIES = [
  { id: 'booking',  label: 'Booking',     icon: Calendar,   accent: 'text-[#E96B56]', bg: 'bg-[#fdf3f1]', description: 'Booking, availability, service types' },
  { id: 'payments', label: 'Payments',    icon: CreditCard, accent: 'text-[#4f8ef7]', bg: 'bg-[#f0f5ff]', description: 'Charges, refunds, cancellations' },
  { id: 'artists',  label: 'For artists', icon: Sparkles,   accent: 'text-[#8b5cf6]', bg: 'bg-[#f5f0ff]', description: 'Joining, earnings, pricing' },
]

// Category pill badge colours
const BADGE: Record<string, string> = {
  booking:  'bg-[#fdf3f1] text-[#E96B56]',
  payments: 'bg-[#f0f5ff] text-[#4f8ef7]',
  artists:  'bg-[#f5f0ff] text-[#8b5cf6]',
}

// ─── Keyword highlight helper ──────────────────────────────────────────────────

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark
            key={i}
            className="bg-[#fdf3f1] text-[#E96B56] not-italic font-semibold rounded-[3px] px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

// ─── Q&A card — always-visible answer, no accordion ───────────────────────────

function QACard({
  item,
  query,
}: {
  item: typeof ALL_QA[number]
  query: string
}) {
  return (
    <div className="group bg-white border border-[#e8e1de] rounded-2xl p-5 hover:border-[#E96B56]/30 hover:shadow-[0_2px_16px_rgba(233,107,86,0.06)] transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-semibold text-sm text-[#1A1A1A] leading-snug flex-1">
          {highlight(item.q, query)}
        </p>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${BADGE[item.category]}`}>
          {item.categoryLabel}
        </span>
      </div>
      <p className="text-[0.8125rem] text-[#717171] leading-[1.65]">
        {highlight(item.a, query)}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpCentrePage() {
  const [query, setQuery]           = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const hasQuery      = query.trim().length > 0
  const isFiltered    = hasQuery || activeCategory !== 'all'
  const popularItems  = ALL_QA.filter(i => i.popular)

  // Real-time filtered results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    let items = activeCategory === 'all'
      ? ALL_QA
      : ALL_QA.filter(i => i.category === activeCategory)
    if (q) {
      items = items.filter(
        i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)
      )
    }
    return items
  }, [query, activeCategory])

  function clearSearch() {
    setQuery('')
    setActiveCategory('all')
    inputRef.current?.focus()
  }

  return (
    <div className="bg-white min-h-screen">

      {/* ─── Hero — search-first ──────────────────────────────────────────── */}
      <section className="pt-14 pb-10 md:pt-20 md:pb-12 border-b border-[#e8e1de]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 text-center">

          <p className="section-label mb-4">Help centre</p>
          <h1 className="font-headline text-[2.25rem] md:text-[2.875rem] text-[#1A1A1A] leading-[1.08] mb-6">
            How can we help?
          </h1>

          {/* Primary search input */}
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADADAD] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for answers…"
              className="w-full pl-[3.25rem] pr-12 py-4 rounded-2xl border-2 border-[#e8e1de] bg-white text-[0.9375rem] text-[#1A1A1A] placeholder:text-[#ADADAD] focus:outline-none focus:border-[#E96B56]/50 focus:ring-4 focus:ring-[#E96B56]/8 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f3ece9] hover:bg-[#e8deda] flex items-center justify-center transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-[#717171]" />
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {[{ id: 'all', label: 'All topics' }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label }))].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-150 ${
                  activeCategory === cat.id
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#717171] border-[#e8e1de] hover:border-[#1A1A1A]/25 hover:text-[#1A1A1A]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 py-10 md:py-12">

        {isFiltered ? (

          /* ── Search / filtered results ── */
          <div>
            {/* Result count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[#8A8A8A]">
                {results.length > 0 ? (
                  <><span className="font-semibold text-[#1A1A1A]">{results.length}</span> result{results.length !== 1 ? 's' : ''}{hasQuery && <> for <span className="text-[#1A1A1A]">&ldquo;{query}&rdquo;</span></>}</>
                ) : (
                  <>No results{hasQuery && <> for &ldquo;{query}&rdquo;</>}</>
                )}
              </p>
              <button
                onClick={clearSearch}
                className="text-xs font-semibold text-[#8A8A8A] hover:text-[#E96B56] transition-colors"
              >
                Clear
              </button>
            </div>

            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map(item => (
                  <QACard key={item.id} item={item} query={query} />
                ))}
              </div>
            ) : (
              /* No results */
              <div className="bg-white border border-[#e8e1de] rounded-2xl py-14 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#f3ece9] flex items-center justify-center mx-auto mb-4">
                  <Search className="w-4 h-4 text-[#ADADAD]" />
                </div>
                <p className="font-semibold text-[#1A1A1A] text-sm mb-1">No results found</p>
                <p className="text-sm text-[#8A8A8A] mb-5 max-w-xs mx-auto">
                  Try a different search term, or browse all topics below.
                </p>
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E96B56] hover:underline underline-offset-4"
                >
                  Browse all topics <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        ) : (

          /* ── Default state: Popular + Browse by topic ── */
          <div className="space-y-12">

            {/* Popular questions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#1A1A1A] text-base">Popular questions</h2>
                <span className="text-xs text-[#ADADAD]">{popularItems.length} questions</span>
              </div>
              <div className="space-y-3">
                {popularItems.map(item => (
                  <QACard key={item.id} item={item} query="" />
                ))}
              </div>
            </div>

            {/* Browse by topic */}
            <div>
              <h2 className="font-semibold text-[#1A1A1A] text-base mb-4">Browse by topic</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  const count = ALL_QA.filter(i => i.category === cat.id).length
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className="group text-left p-5 rounded-2xl bg-white border border-[#e8e1de] hover:border-[#E96B56]/30 hover:shadow-[0_2px_16px_rgba(233,107,86,0.06)] transition-all duration-200"
                    >
                      <div className={`w-9 h-9 ${cat.bg} rounded-xl flex items-center justify-center mb-3`}>
                        <Icon className={`w-4 h-4 ${cat.accent}`} />
                      </div>
                      <p className="font-semibold text-sm text-[#1A1A1A] mb-1 group-hover:text-[#E96B56] transition-colors">
                        {cat.label}
                      </p>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed mb-2">{cat.description}</p>
                      <p className="text-[11px] text-[#ADADAD]">{count} questions</p>
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

        )}

        {/* Re-engagement */}
        <p className="mt-10 text-sm text-[#ADADAD] text-center">
          Got your answer?{' '}
          <a href="/search" className="font-semibold text-[#E96B56] hover:underline underline-offset-4">
            Browse artists →
          </a>
        </p>

      </div>

      {/* ─── Support CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#e8e1de] bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-20 py-10 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="section-label mb-2">Still need help?</p>
              <h2 className="font-headline text-xl text-[#1A1A1A] leading-snug mb-1">
                Our team is here when something feels off.
              </h2>
              <p className="text-sm text-[#8A8A8A]">No concern is too small — we review every message.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-sparq-ai'))}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E96B56] text-white px-6 py-3 text-sm font-semibold hover:bg-[#d45a45] transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Chat with Sparq AI
              </button>
              <a
                href="mailto:hello@sparq.com.au"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e8e1de] text-[#1A1A1A] px-6 py-3 text-sm font-semibold hover:border-[#1A1A1A]/30 hover:bg-[#f9f2ef] transition-colors"
              >
                <Mail className="h-4 w-4" />
                Email support
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
