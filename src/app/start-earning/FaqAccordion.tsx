'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const FAQS = [
  {
    q: 'Is it free to join?',
    a: 'Yes — creating your artist profile is completely free. Sparq charges a small booking fee per appointment, which is deducted automatically. No upfront costs, no monthly fees.',
  },
  {
    q: 'Do I need a studio or salon?',
    a: 'No. You can offer services at clients\u2019 homes, in your own studio, or both. You decide where you work.',
  },
  {
    q: 'When and how do I get paid?',
    a: 'Payments are processed securely through Stripe. Once a booking is completed, funds are released to your account within 1\u20132 business days.',
  },
  {
    q: 'Am I covered if something goes wrong on a job?',
    a: 'Sparq holds client payment until a booking is marked complete, so you\u2019re always paid for your work. If a dispute arises, our support team steps in and reviews the situation fairly \u2014 you won\u2019t be left to handle it alone. For on-location work, we strongly recommend holding your own public liability insurance. We can point you to trusted providers when you join.',
  },
  {
    q: 'Do I need public liability insurance?',
    a: 'We strongly recommend it \u2014 especially if you offer mobile (at-home) services. Public liability insurance protects you if a client makes a claim related to your work or presence at their property. It\u2019s affordable, professional, and gives you real peace of mind. We\u2019ll share guidance on suitable providers when you complete your profile.',
  },
  {
    q: 'Can I set my own prices?',
    a: 'Absolutely. You control your service menu and pricing. We show you what similar artists charge in your area to help you stay competitive.',
  },
  {
    q: 'What\u2019s the platform fee?',
    a: 'Sparq charges a 10% booking fee on each transaction. Premium artists can reduce this to 5% by upgrading their subscription.',
  },
  {
    q: 'How do I get my first client?',
    a: 'Once your profile is live, you\u2019ll appear in search results. A strong portfolio, accurate pricing, and a clear tagline significantly improve your visibility from day one.',
  },
]

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y divide-[#e8e1de]">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-[#E96B56]"
          >
            <span className="text-[0.95rem] font-semibold text-[#1A1A1A]">{faq.q}</span>
            <span className="flex-shrink-0 text-[#717171]">
              {open === i
                ? <Minus className="h-4 w-4" />
                : <Plus className="h-4 w-4" />
              }
            </span>
          </button>
          {open === i && (
            <p className="pb-5 text-sm text-[#717171] leading-relaxed max-w-2xl">
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
