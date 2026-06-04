import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  CalendarCheck,
  CreditCard,
  Sparkles,
  UserPlus,
  ImagePlus,
  ClipboardList,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works | Sparq",
  description:
    "Learn how Sparq works for customers booking nail and lash services, and for artists looking to grow their client base in Melbourne.",
};

const CUSTOMER_STEPS = [
  {
    icon: Search,
    title: "Search for an artist",
    description:
      "Use our search to find nail and lash artists in your Melbourne suburb. Filter by service type (gel, acrylic, lash extensions etc.), price range, availability, and rating. Read verified reviews from real customers.",
  },
  {
    icon: CalendarCheck,
    title: "Book an appointment",
    description:
      "Choose a time slot that suits you and book instantly — no waiting for a reply, no phone tag. You'll receive an email confirmation immediately and a reminder before your appointment.",
  },
  {
    icon: CreditCard,
    title: "Pay securely",
    description:
      "Enter your payment details through our Stripe-powered checkout. Your funds are held securely and only released to the artist after your service is complete. No surprises, no cash handling.",
  },
  {
    icon: Sparkles,
    title: "Enjoy your service",
    description:
      "Turn up and enjoy your appointment. After it's done, leave a verified review to help others in the Sparq community make great choices.",
  },
];

const PROVIDER_STEPS = [
  {
    icon: UserPlus,
    title: "Create your provider account",
    description:
      "Sign up and choose 'I'm a provider'. Complete your identity verification — we check that you are who you say you are to keep the platform safe.",
  },
  {
    icon: ImagePlus,
    title: "Build your profile",
    description:
      "Add your bio, upload portfolio photos of your work, list your services with prices, and set your availability calendar. A complete profile gets more bookings.",
  },
  {
    icon: ClipboardList,
    title: "Accept bookings",
    description:
      "Customers find you through search and book directly into your calendar. You'll get notified immediately. Manage all your upcoming appointments from your provider dashboard.",
  },
  {
    icon: BadgeCheck,
    title: "Get paid",
    description:
      "After each completed appointment, your earnings are released and transferred to your connected bank account via Stripe. Transparent, automatic, and on time.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-neutral-950 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">How Sparq works</h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
            Whether you're looking to book your next nail or lash appointment, or grow your
            beauty business — Sparq makes it simple.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 space-y-20">

        {/* For Customers */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
              For Customers
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Booking your appointment</h2>
          </div>

          <div className="space-y-8">
            {CUSTOMER_STEPS.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow">
                    <Icon className="size-5" />
                  </div>
                  {i < CUSTOMER_STEPS.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-neutral-200" />
                  )}
                </div>
                <div className="pb-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
            >
              Browse Artists
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* For Providers */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
              For Providers
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Growing your business</h2>
          </div>

          <div className="space-y-8">
            {PROVIDER_STEPS.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow">
                    <Icon className="size-5" />
                  </div>
                  {i < PROVIDER_STEPS.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-neutral-200" />
                  )}
                </div>
                <div className="pb-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Link
              href="/become-a-provider"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
            >
              Become a Provider
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Questions */}
        <section className="rounded-2xl bg-neutral-50 border border-neutral-200 p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-500 mb-6">
            Check out our FAQ or reach out to the Sparq team directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
            >
              View FAQ
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
