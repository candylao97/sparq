import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp,
  CalendarDays,
  Banknote,
  Users,
  ShieldCheck,
  UserPlus,
  ImagePlus,
  ClipboardList,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Become a Provider | Sparq",
  description:
    "Join Sparq as a nail or lash artist in Melbourne. Grow your client base, manage your bookings online, and get paid securely.",
};

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Grow your client base",
    description:
      "Get discovered by customers actively searching for artists in your suburb. Sparq's SEO and marketing brings clients to you.",
  },
  {
    icon: CalendarDays,
    title: "Manage your schedule",
    description:
      "Set your own availability, block out personal time, and accept or decline bookings — you're in control.",
  },
  {
    icon: Banknote,
    title: "Get paid automatically",
    description:
      "Stripe handles all payments. Your earnings are released after each completed appointment and transferred directly to your bank.",
  },
  {
    icon: Users,
    title: "Build your reputation",
    description:
      "Collect verified reviews from real clients. A strong profile with great reviews drives more bookings over time.",
  },
  {
    icon: ShieldCheck,
    title: "Platform protection",
    description:
      "Sparq's anti-circumvention policy and secure payment system protect you from no-shows and payment disputes.",
  },
];

const JOIN_STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign up as a provider",
    description:
      "Create your Sparq account and select 'I'm a provider'. Complete the identity verification process — this usually takes less than 5 minutes.",
  },
  {
    icon: ImagePlus,
    step: "02",
    title: "Build your profile",
    description:
      "Add your bio, upload portfolio photos, list your services with prices and durations, and connect your bank account via Stripe.",
  },
  {
    icon: ClipboardList,
    step: "03",
    title: "Set your availability",
    description:
      "Open up your calendar and set your working hours. You can update these at any time from your provider dashboard.",
  },
  {
    icon: ShieldCheck,
    step: "04",
    title: "Get approved & go live",
    description:
      "Our team reviews your profile (usually within 48 hours). Once approved, you'll appear in search results and can start accepting bookings.",
  },
];

export default function BecomeAProviderPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-neutral-950 text-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block mb-4 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium">
            Join Sparq as a provider
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            Grow your beauty business in Melbourne
          </h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto mb-10">
            Sparq connects talented nail and lash artists with clients who are ready to book.
            No chasing leads — just a full calendar.
          </p>
          <Link
            href="/signup?role=provider"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-900 shadow-lg hover:bg-neutral-200 transition-colors"
          >
            Apply to Join
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 space-y-20">

        {/* Benefits */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Why join Sparq?</h2>
          <p className="text-gray-500 mb-10">
            We built Sparq to make running a beauty business easier — not harder.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-neutral-300 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-neutral-900 text-white mb-4">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Steps to join */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How to get started</h2>
          <p className="text-gray-500 mb-10">
            From sign-up to live profile in as little as 48 hours.
          </p>

          <div className="space-y-8">
            {JOIN_STEPS.map(({ icon: Icon, step, title, description }, i) => (
              <div key={step} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow">
                    <Icon className="size-5" />
                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-white border-2 border-neutral-900 text-[10px] font-bold text-neutral-900">
                      {step}
                    </span>
                  </div>
                  {i < JOIN_STEPS.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-neutral-200" />
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-neutral-950 text-white p-10 text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to grow your business?</h3>
          <p className="text-neutral-300 mb-8 max-w-xl mx-auto">
            Join Melbourne's dedicated nail and lash marketplace. Applications take less than 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup?role=provider"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-900 hover:bg-neutral-200 transition-colors"
            >
              Apply Now
              <ChevronRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Ask a question
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
