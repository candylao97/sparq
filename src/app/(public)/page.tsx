import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  CalendarCheck,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Star,
  Lock,
  ArrowRight,
  Paintbrush2,
  Eye,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sparq | Find Trusted Nail & Lash Artists in Melbourne",
  description:
    "Sparq connects you with verified nail and lash artists across Melbourne. Browse, book, and pay securely — all in one place.",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Search,
    title: "Search",
    description:
      "Browse nail and lash artists near you. Filter by suburb, service type, price, and availability.",
  },
  {
    step: "02",
    icon: CalendarCheck,
    title: "Book",
    description:
      "Pick a time that works for you and book instantly — no phone calls, no chasing messages.",
  },
  {
    step: "03",
    icon: CreditCard,
    title: "Pay securely",
    description:
      "Your payment is held safely by Stripe and only released to the artist after your appointment.",
  },
  {
    step: "04",
    icon: Sparkles,
    title: "Get serviced",
    description:
      "Enjoy your appointment. Leave a verified review to help others in the community.",
  },
];

const CATEGORIES = [
  {
    icon: Paintbrush2,
    name: "Nails",
    tagline: "Gel, acrylic, nail art & more",
    description:
      "From classic gel manicures to intricate nail art, find a nail artist who matches your style and budget.",
    href: "/services#nails",
    gradient: "from-pink-100 via-rose-50 to-orange-50",
    iconColor: "text-pink-500",
  },
  {
    icon: Eye,
    name: "Lashes",
    tagline: "Classic, volume & hybrid sets",
    description:
      "Explore classic, hybrid, and volume lash extensions applied by trained, certified lash technicians.",
    href: "/services#lashes",
    gradient: "from-indigo-100 via-violet-50 to-purple-50",
    iconColor: "text-indigo-500",
  },
];

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Verified artists",
    description:
      "Every provider on Sparq goes through an identity and qualification check before accepting bookings.",
  },
  {
    icon: Lock,
    title: "Secure payments",
    description:
      "Payments are processed by Stripe and held in escrow until your service is complete.",
  },
  {
    icon: Star,
    title: "Verified reviews",
    description:
      "Only customers who have completed a booking can leave a review — keeping feedback genuine.",
  },
];

const SUBURBS = [
  "Melbourne CBD",
  "Southbank",
  "Docklands",
  "Carlton",
  "Fitzroy",
  "Richmond",
  "South Yarra",
  "Brunswick",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-100 bg-neutral-50">
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-600 shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Now live in Melbourne
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
            Book beauty,
            <br />
            beautifully.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-500 sm:text-xl">
            Sparq connects you with verified nail &amp; lash artists across
            Melbourne. Browse, book online, and pay securely — all in one place.
          </p>

          {/* Search */}
          <form
            action="/providers"
            className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full border border-neutral-200 bg-white p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" />
              <input
                name="keyword"
                placeholder="Search artists, services or suburbs"
                className="h-12 w-full rounded-full bg-transparent pl-12 pr-2 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-6 text-base font-semibold text-white transition-colors hover:bg-neutral-700"
            >
              Search
              <ArrowRight className="size-4" />
            </button>
          </form>

          {/* Suburb quick-links */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {SUBURBS.map((suburb) => (
              <Link
                key={suburb}
                href={`/providers?suburb=${encodeURIComponent(suburb)}`}
                className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900"
              >
                {suburb}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              From discovery to done
            </h2>
            <p className="mt-3 text-lg text-neutral-500">
              Booking your next appointment is effortless.
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
              <div key={step} className="flex flex-col">
                <span className="text-sm font-semibold text-neutral-300">
                  {step}
                </span>
                <div className="mt-3 flex size-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-neutral-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Services we cover
            </h2>
            <p className="mt-3 text-lg text-neutral-500">
              Two specialised categories, one trusted marketplace.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {CATEGORIES.map(
              ({ icon: Icon, name, tagline, description, href, gradient, iconColor }) => (
                <Link
                  key={name}
                  href={href}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_50px_-16px_rgba(0,0,0,0.2)]"
                >
                  <div
                    className={`flex aspect-[16/7] items-center justify-center bg-gradient-to-br ${gradient}`}
                  >
                    <Icon className={`size-14 ${iconColor}`} />
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      {tagline}
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-neutral-900">
                      {name}
                    </h3>
                    <p className="mt-2 leading-relaxed text-neutral-500">
                      {description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 transition-all group-hover:gap-2">
                      Explore {name}
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Built on trust
            </h2>
            <p className="mt-3 text-lg text-neutral-500">
              Safety and transparency are at the core of everything we do.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {TRUST.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 p-7"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-neutral-950 py-24 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Ready for your next appointment?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-400">
            Join thousands of Melburnians who book their nail and lash services
            through Sparq.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/providers"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              Browse artists
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Create a free account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
