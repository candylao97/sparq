import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ | Sparq",
  description:
    "Frequently asked questions about using Sparq to book nail and lash services in Melbourne, or to list your services as a provider.",
};

const CUSTOMER_FAQS = [
  {
    question: "How do I book an appointment?",
    answer:
      "Create a free Sparq account, search for artists in your suburb, browse profiles and reviews, then select a service and time slot. Confirm your booking by completing the secure checkout — you'll receive a confirmation email immediately.",
  },
  {
    question: "Is my payment secure?",
    answer:
      "Yes. All payments are processed by Stripe, a PCI-DSS Level 1 certified payment processor. Sparq never stores your full card details. Your funds are held in escrow until your appointment is complete, at which point they are released to the artist.",
  },
  {
    question: "What if I need to cancel my booking?",
    answer:
      "You can cancel through your Sparq account. Whether you receive a refund depends on when you cancel relative to the appointment time. Full details are in our Cancellation Policy. Generally, cancellations made more than 48 hours in advance are fully refunded.",
  },
  {
    question: "What if the artist cancels?",
    answer:
      "If a provider cancels your appointment, you will receive a full refund within 3–5 business days. We will also notify you immediately and can help you find an alternative artist.",
  },
  {
    question: "Are reviews genuine?",
    answer:
      "Yes. Only customers who have completed a paid booking through Sparq can leave a review. Reviews are attached to verified transactions, so they reflect real experiences.",
  },
  {
    question: "What suburbs does Sparq cover?",
    answer:
      "Sparq launched across inner Melbourne including Melbourne CBD, Southbank, Docklands, Carlton, Fitzroy, Richmond, South Yarra, and Brunswick. We're expanding regularly — more suburbs coming soon.",
  },
  {
    question: "Can I book mobile / at-home services?",
    answer:
      "Some providers on Sparq offer mobile services and will travel to you. You'll see a 'Mobile' badge on their profile. Not all providers offer this, so check before booking.",
  },
  {
    question: "What if I'm unhappy with the result?",
    answer:
      "Contact our support team within 48 hours of your appointment. We'll review the situation and work to find a fair resolution — which may include a partial or full refund depending on the circumstances.",
  },
];

const PROVIDER_FAQS = [
  {
    question: "How much does it cost to join Sparq?",
    answer:
      "Creating a provider profile on Sparq is free. Sparq charges a platform fee on each completed booking — this is deducted automatically before your payout. The fee structure is shown during onboarding.",
  },
  {
    question: "How and when do I get paid?",
    answer:
      "Payments are processed via Stripe Connect and transferred to your connected bank account. Payouts are initiated after each completed appointment and typically arrive within 2–3 business days.",
  },
  {
    question: "Can I set my own prices?",
    answer:
      "Yes. You have full control over your pricing. You can set different prices for each service you offer. We recommend researching local market rates to stay competitive.",
  },
  {
    question: "What happens if a customer doesn't show up?",
    answer:
      "Sparq's no-show policy protects providers. If a confirmed customer does not attend, you are entitled to a no-show fee as outlined in our Cancellation Policy. This is deducted from the customer's held payment.",
  },
  {
    question: "Can I decline bookings?",
    answer:
      "You can set your availability to prevent unwanted bookings. Instant-book is optional — you can also set your profile to 'request to book' mode, where you approve each booking before it's confirmed.",
  },
  {
    question: "Do I need insurance?",
    answer:
      "We strongly recommend public liability insurance for all providers. It may be required before your profile is approved. Contact us if you need guidance on obtaining affordable coverage.",
  },
  {
    question: "How long does profile approval take?",
    answer:
      "Our team typically reviews new provider profiles within 48 hours of submission. You'll receive an email notification when your profile is approved or if we need additional information.",
  },
  {
    question: "Can I offer both nail and lash services?",
    answer:
      "Yes, if you are qualified in both disciplines. You can list multiple services under your single provider profile. Each service category may require separate verification of qualifications.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-gray-100 last:border-0">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-left font-semibold text-gray-900 hover:text-neutral-700 transition-colors [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <ChevronRight className="size-5 shrink-0 mt-0.5 text-gray-400 transition-transform duration-200 group-open:rotate-90" />
      </summary>
      <div className="pb-5 pr-6">
        <p className="text-gray-500 leading-relaxed text-sm">{answer}</p>
      </div>
    </details>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-neutral-950 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20">
              <HelpCircle className="size-7" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Frequently asked questions</h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
            Can't find the answer you're looking for? Reach out to our team.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 space-y-16">

        {/* Customers */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
              For Customers
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Booking &amp; Payments</h2>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 px-6">
            {CUSTOMER_FAQS.map((faq) => (
              <FaqItem key={faq.question} {...faq} />
            ))}
          </div>
        </section>

        {/* Providers */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
              For Providers
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Listings &amp; Payouts</h2>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 px-6">
            {PROVIDER_FAQS.map((faq) => (
              <FaqItem key={faq.question} {...faq} />
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="rounded-2xl bg-neutral-50 border border-neutral-200 p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-500 mb-6">
            Our support team is happy to help. We typically respond within one business day.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
          >
            Contact Support
            <ChevronRight className="size-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
