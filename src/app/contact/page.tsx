'use client'

import { useState } from 'react'
import { MessageCircle, ChevronDown, Mail } from 'lucide-react'

const FAQS = [
  {
    category: 'Booking',
    items: [
      {
        q: 'Is it free to browse and compare artists?',
        a: 'Yes — completely free. Search, view portfolios, and compare prices before you commit to anything.',
      },
      {
        q: 'Can I book at home or in a studio?',
        a: 'Both. Filter by artists who travel to you, work from a studio, or offer both.',
      },
      {
        q: 'What happens if I need to cancel?',
        a: 'Free cancellation up to 24 hours before your appointment. Late cancellations may incur a small fee, always shown upfront.',
      },
      {
        q: 'How do I know the artist is verified?',
        a: 'Every artist goes through identity verification before their first booking is accepted.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        q: 'When does my card get charged?',
        a: 'We place a hold when you book — not a charge. Payment releases only after your appointment is complete.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. All payments go through Stripe. We never store your full card details.',
      },
      {
        q: 'Can I get a refund?',
        a: 'If you cancel in time, your hold is released immediately. Disputes after an appointment are reviewed fairly by our team.',
      },
    ],
  },
  {
    category: 'For artists',
    items: [
      {
        q: 'How do I get paid?',
        a: 'Payment is released to your bank within 2–3 business days after each completed appointment.',
      },
      {
        q: 'How much does it cost to join?',
        a: 'Free to list. Sparq takes a small commission only when you complete a booking — no upfront fees, no subscriptions.',
      },
      {
        q: 'Do I need to be certified?',
        a: 'No formal certification required. Many of our top artists started as hobbyists.',
      },
      {
        q: 'Can I set my own prices and availability?',
        a: 'Absolutely. You control your prices, schedule, and bookings. Pause anytime.',
      },
    ],
  },
]

export default function ContactPage() {
  const [openItem, setOpenItem] = useState<string | null>(null)

  return (
    <div className="bg-[#FDFBF7]">

      {/* ─── Hero ─── */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-20 text-center border-b border-[#e8e1de]">
        <div className="mx-auto max-w-xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E96B56] mb-4">
            Support
          </p>
          <h1 className="font-headline text-[3rem] md:text-[4rem] text-[#1A1A1A] leading-[1.1] mb-4">
            How can we help?
          </h1>
          <p className="text-lg text-[#555] mb-8">
            Browse the FAQs below, or chat with our AI for instant answers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const bubble =
                  document.querySelector<HTMLButtonElement>('[aria-label="Ask Sparq AI"]') ||
                  document.querySelector<HTMLButtonElement>('button.fixed.bottom-5, button.fixed.bottom-6')
                if (bubble) bubble.click()
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#E96B56] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#d45a45] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with Sparq AI
            </button>
            <a
              href="mailto:hello@sparq.com.au"
              className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A]/20 px-7 py-3.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email us
            </a>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-12">
            {FAQS.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#717171] mb-4">
                  {group.category}
                </p>
                <div className="divide-y divide-[#e8e1de]">
                  {group.items.map((item) => {
                    const key = `${group.category}-${item.q}`
                    const isOpen = openItem === key
                    return (
                      <div key={key}>
                        <button
                          onClick={() => setOpenItem(isOpen ? null : key)}
                          className="w-full flex items-center justify-between py-4 text-left group"
                          aria-expanded={isOpen}
                        >
                          <span className="font-medium text-[#1A1A1A] text-sm pr-4 group-hover:text-[#E96B56] transition-colors">
                            {item.q}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#717171] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="pb-5 text-sm text-[#717171] leading-relaxed">
                            {item.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Still need help */}
          <div className="mt-16 rounded-2xl bg-[#f9f2ef] border border-[#e8e1de] p-8 text-center">
            <p className="font-semibold text-[#1A1A1A] mb-2">Still have a question?</p>
            <p className="text-sm text-[#717171] mb-6">Our AI assistant is available 24/7 and can handle most requests instantly.</p>
            <button
              type="button"
              onClick={() => {
                const bubble =
                  document.querySelector<HTMLButtonElement>('[aria-label="Ask Sparq AI"]') ||
                  document.querySelector<HTMLButtonElement>('button.fixed.bottom-5, button.fixed.bottom-6')
                if (bubble) bubble.click()
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#333] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Chat now
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
