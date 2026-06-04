import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Star,
  AlertTriangle,
  UserCheck,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Trust & Safety | Sparq",
  description:
    "Learn how Sparq protects customers and providers through verified reviews, secure payments, identity checks, and anti-circumvention policies.",
};

const POLICIES = [
  {
    icon: UserCheck,
    title: "Provider Verification",
    content: [
      "Every provider on Sparq goes through an identity verification process before their profile goes live. This includes government-issued ID checks to confirm they are who they say they are.",
      "For lash technicians, we require evidence of formal training or certification. Nail artists must demonstrate at least 12 months of professional experience through portfolio review.",
      "Profiles that do not meet our standards are not published. We reserve the right to remove any provider who violates our community standards.",
    ],
  },
  {
    icon: Star,
    title: "Verified Reviews",
    content: [
      "Only customers who have completed a paid booking through Sparq can leave a review. This means every review on the platform reflects a genuine, verified experience.",
      "Reviews cannot be edited or deleted by providers. If you believe a review violates our guidelines (e.g. contains hate speech or is factually inaccurate), you can flag it for our moderation team.",
      "Providers are able to respond publicly to reviews. We encourage constructive, professional responses.",
    ],
  },
  {
    icon: Lock,
    title: "Secure Payments",
    content: [
      "All payments on Sparq are processed by Stripe, a PCI-DSS Level 1 compliant payment processor. Sparq never stores your full card details.",
      "Customer payments are held in escrow and only released to the provider after the appointment is marked complete. This protects you if a service is not delivered.",
      "Providers receive payouts directly to their connected bank account via Stripe Connect. Transfer times are typically 2–3 business days.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Anti-Circumvention Policy",
    content: [
      "Customers and providers may not arrange or conduct transactions outside the Sparq platform for services discovered through Sparq. This protects both parties: customers lose payment protection and providers lose dispute resolution support when going off-platform.",
      "If a provider asks you to pay via bank transfer, cash, or any method other than Sparq's checkout — please report it to us immediately.",
      "Accounts found to be circumventing the platform will be suspended. Repeat offenders will be permanently banned.",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Dispute Resolution",
    content: [
      "If something goes wrong with a booking, our support team is here to help. Contact us within 48 hours of the appointment for disputes related to service quality.",
      "For no-shows and cancellations, our cancellation policy applies — see the Cancellation & Refund Policy for full details.",
      "We aim to resolve all disputes within 5 business days. Complex cases involving partial refunds or chargebacks may take longer.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Data & Privacy",
    content: [
      "Sparq collects only the data necessary to operate the marketplace. We do not sell your personal information to third parties.",
      "Payment data is handled entirely by Stripe. We store only the minimum tokenised identifiers required to process refunds.",
      "For full details on how we collect, use, and store your data, please read our Privacy Policy.",
    ],
  },
];

export default function TrustAndSafetyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-neutral-950 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20">
              <ShieldCheck className="size-7" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Trust &amp; Safety</h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
            Sparq is built on transparency and accountability. Here's how we protect everyone on the platform.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="space-y-12">
          {POLICIES.map(({ icon: Icon, title, content }) => (
            <section key={title} className="flex flex-col sm:flex-row gap-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 h-fit">
                <Icon className="size-6 text-neutral-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
                <div className="space-y-3">
                  {content.map((paragraph, i) => (
                    <p key={i} className="text-gray-600 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Report section */}
        <div className="mt-16 rounded-2xl bg-amber-50 border border-amber-200 p-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="size-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Report a safety concern</h3>
              <p className="text-gray-600 text-sm mb-4">
                If you experience or witness behaviour that violates our policies — including
                harassment, fraud, or attempts to take transactions off-platform — please contact
                our trust team immediately. All reports are treated confidentially.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Report an issue
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Related links */}
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/privacy" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Privacy Policy →
          </Link>
          <Link href="/terms" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Terms of Service →
          </Link>
          <Link href="/cancellation-policy" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Cancellation Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
