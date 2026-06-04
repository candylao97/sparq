import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Ban, AlertTriangle, RefreshCw, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | Sparq",
  description:
    "Understand Sparq's cancellation and refund policy for customers and providers, including timeframes, no-show fees, and how refunds are processed.",
};

const LAST_UPDATED = "14 March 2026";

const CUSTOMER_TIERS = [
  {
    label: "More than 48 hours before appointment",
    refund: "Full refund",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-700",
    icon: "green",
  },
  {
    label: "24–48 hours before appointment",
    refund: "50% refund",
    color: "bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-700",
    icon: "amber",
  },
  {
    label: "Less than 24 hours before appointment",
    refund: "No refund",
    color: "bg-red-50 border-red-200",
    badgeColor: "bg-red-100 text-red-700",
    icon: "red",
  },
  {
    label: "No-show (appointment time passes with no contact)",
    refund: "No refund",
    color: "bg-red-50 border-red-200",
    badgeColor: "bg-red-100 text-red-700",
    icon: "red",
  },
];

const PROVIDER_TIERS = [
  {
    label: "Provider cancels more than 48 hours before appointment",
    outcome: "Customer receives full refund. No penalty to provider for first occurrence.",
    color: "bg-blue-50 border-blue-200",
  },
  {
    label: "Provider cancels less than 48 hours before appointment",
    outcome: "Customer receives full refund. Provider may receive a penalty fee and the cancellation is recorded on their account.",
    color: "bg-amber-50 border-amber-200",
  },
  {
    label: "Provider is a no-show",
    outcome: "Customer receives full refund. Provider account is reviewed and may be suspended.",
    color: "bg-red-50 border-red-200",
  },
];

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cancellation &amp; Refund Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-14">

        {/* Overview */}
        <section>
          <p className="text-gray-600 leading-relaxed text-lg">
            We understand that plans change. This policy sets out how cancellations are handled on
            Sparq for both customers and providers, and when refunds apply.
          </p>
        </section>

        {/* Customer cancellations */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100">
              <Clock className="size-5 text-neutral-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Customer cancellations</h2>
          </div>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            To cancel a booking, log in to your Sparq account, go to your upcoming appointments, and
            select &quot;Cancel booking&quot;. Cancellation times are calculated relative to the scheduled
            appointment start time in AEST.
          </p>
          <div className="space-y-3">
            {CUSTOMER_TIERS.map(({ label, refund, color, badgeColor }) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${color}`}
              >
                <span className="text-sm text-gray-700">{label}</span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>
                  {refund}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Sparq platform fees are non-refundable in all cases. Refunds apply to the service
              amount only.
            </p>
          </div>
        </section>

        {/* Provider cancellations */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100">
              <Ban className="size-5 text-neutral-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Provider cancellations</h2>
          </div>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            Providers should only accept bookings they can honour. Repeated cancellations damage
            customer trust and may result in account restrictions.
          </p>
          <div className="space-y-3">
            {PROVIDER_TIERS.map(({ label, outcome, color }) => (
              <div key={label} className={`rounded-xl border p-5 ${color}`}>
                <p className="font-semibold text-gray-900 text-sm mb-1">{label}</p>
                <p className="text-sm text-gray-600">{outcome}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Refund processing */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-green-100">
              <RefreshCw className="size-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">How refunds are processed</h2>
          </div>
          <div className="prose prose-gray prose-sm max-w-none prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600">
            <ul>
              <li>
                Approved refunds are processed back to your original payment method via Stripe. This
                typically takes <strong>3–5 business days</strong> to appear on your statement,
                depending on your bank.
              </li>
              <li>
                Stripe processing fees (approximately 1.75% + 30¢) are deducted from refunds in
                line with Stripe's refund policy. Sparq will absorb this fee for provider-initiated
                cancellations.
              </li>
              <li>
                You will receive an email notification when a refund is issued. If you do not see the
                refund within 7 business days, contact your bank before reaching out to Sparq support.
              </li>
            </ul>
          </div>
        </section>

        {/* Exceptions */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100">
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Exceptional circumstances</h2>
          </div>
          <div className="prose prose-gray prose-sm max-w-none prose-p:text-gray-600 prose-p:leading-relaxed">
            <p>
              In cases of genuine emergency — such as hospitalisation, natural disaster, or bereavement
              — Sparq may issue a full refund outside the standard policy. Contact our support team
              with supporting information and we will assess each case individually.
            </p>
            <p>
              Disputes about service quality (e.g. unsatisfactory results) are handled separately
              under our dispute resolution process and do not automatically entitle the customer to a
              refund. Please refer to our{" "}
              <Link href="/trust-and-safety">Trust &amp; Safety</Link> page for more information.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl bg-neutral-50 border border-neutral-200 p-8">
          <div className="flex items-start gap-4">
            <HelpCircle className="size-6 text-neutral-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Questions about a cancellation or refund?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Contact our support team within 48 hours of the appointment. Include your booking
                reference number for faster resolution.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>

        {/* Related links */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-4">
          <Link href="/terms" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Terms of Service →
          </Link>
          <Link href="/trust-and-safety" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Trust &amp; Safety →
          </Link>
          <Link href="/faq" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            FAQ →
          </Link>
        </div>
      </div>
    </div>
  );
}
