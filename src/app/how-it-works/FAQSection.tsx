'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    category: 'Booking',
    items: [
      {
        q: 'Is it free to browse and compare artists?',
        a: 'Yes — completely free. Search, view portfolios, read reviews, and compare prices before you commit to anything.',
      },
      {
        q: 'Can I book at home or in a studio?',
        a: 'Both options are available. When browsing, you can filter by artists who travel to you, work from a studio, or offer both. You choose what feels right.',
      },
      {
        q: 'What happens if I need to cancel?',
        a: 'You can cancel or reschedule for free up to 24 hours before your appointment — no questions asked. Late cancellations may incur a small fee, which is always shown clearly before you book.',
      },
      {
        q: 'How do I know the artist is who they say they are?',
        a: 'Every artist on Sparq goes through identity verification before their first booking is accepted. You\'re always connecting with a real, vetted person.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        q: 'When does my card get charged?',
        a: 'When you book, we place a temporary hold on your card — not a charge. The payment only goes through after your appointment is complete. If something goes wrong, you\'re covered.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. All payments are processed through Stripe, which is used by millions of businesses worldwide. We never store your full card details.',
      },
      {
        q: 'Can I get a refund?',
        a: 'If you cancel in time, your hold is released immediately with no charge. For disputes after an appointment, our support team reviews every case fairly.',
      },
    ],
  },
  {
    category: 'For artists',
    items: [
      {
        q: 'How do I get paid as an artist?',
        a: 'After each completed appointment, payment is released directly to your bank account within 2–3 business days. You\'ll receive a breakdown of your earnings and any platform fees in your dashboard.',
      },
      {
        q: 'How much does it cost to join as an artist?',
        a: 'Listing your profile and services is completely free. Sparq takes a small commission only when you complete a booking — no upfront fees, no monthly subscriptions.',
      },
      {
        q: 'Do I need to be a certified professional?',
        a: 'You don\'t need a formal certification to join. We do require you to verify your identity and confirm you have the skills to deliver the services you list. Many of our top-earning artists started as hobbyists.',
      },
      {
        q: 'Can I set my own prices and availability?',
        a: 'Absolutely. You have full control over your prices, schedule, and which types of bookings you accept. You can pause or update your profile any time.',
      },
    ],
  },
]

export default function FAQSection() {
  const [openItem, setOpenItem] = useState<string | null>(null)

  return (
    <section id="faq" className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E96B56] mb-3">
            FAQs
          </p>
          <h2 className="font-headline text-3xl md:text-4xl text-[#1A1A1A]">
            Questions? We&apos;ve got answers.
          </h2>
        </div>

        <div className="space-y-10">
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
                          className={`w-4 h-4 text-[#717171] flex-shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
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
      </div>
    </section>
  )
}
