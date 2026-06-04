import type { Metadata } from "next";
import Link from "next/link";
import { Paintbrush2, Eye, ChevronRight, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Services | Sparq",
  description:
    "Explore nail and lash services available through Sparq — from gel manicures and acrylic sets to classic, hybrid, and volume lash extensions across Melbourne.",
};

const NAIL_SERVICES = [
  {
    name: "Gel Manicure",
    description:
      "A long-lasting, chip-resistant manicure cured under UV/LED light. Includes nail shaping, cuticle care, base coat, colour, and top coat.",
    duration: "45–75 min",
  },
  {
    name: "Acrylic Full Set",
    description:
      "Acrylic extensions applied to natural nails for added length and strength. Perfect for those who want dramatic length.",
    duration: "90–120 min",
  },
  {
    name: "Nail Art",
    description:
      "Custom hand-painted designs, stamping, foils, gems, and 3D art applied by skilled nail artists.",
    duration: "Varies",
  },
  {
    name: "Gel-X / Soft Gel Extensions",
    description:
      "Pre-shaped soft gel tips bonded with gel — lightweight, flexible, and gentle on natural nails.",
    duration: "60–90 min",
  },
  {
    name: "Infills / Rebalance",
    description:
      "Maintenance appointments to fill the new growth on existing acrylic or gel extension sets.",
    duration: "45–75 min",
  },
  {
    name: "Removal",
    description:
      "Safe, professional removal of gel, acrylic, or extension sets with minimal damage to the natural nail.",
    duration: "20–40 min",
  },
];

const LASH_SERVICES = [
  {
    name: "Classic Lash Extensions",
    description:
      "A single extension applied to each natural lash for a natural, mascara-like effect. Great for first-timers.",
    duration: "90–120 min",
  },
  {
    name: "Hybrid Lash Extensions",
    description:
      "A mix of classic and volume techniques for a textured, wispy look with more definition than classic.",
    duration: "100–130 min",
  },
  {
    name: "Volume Lash Extensions",
    description:
      "Multiple fine extensions fanned and applied to each natural lash for a full, glamorous look.",
    duration: "120–150 min",
  },
  {
    name: "Mega Volume",
    description:
      "The most dramatic lash look — ultra-fine extensions in large fans create an intense, striking effect.",
    duration: "150–180 min",
  },
  {
    name: "Lash Infills",
    description:
      "Top-up appointments every 2–3 weeks to replace shed extensions and maintain your full set.",
    duration: "60–90 min",
  },
  {
    name: "Lash Lift & Tint",
    description:
      "A semi-permanent curl applied to natural lashes, combined with a tint for a mascara-free daily look.",
    duration: "45–60 min",
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

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-neutral-950 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Services</h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
            Sparq covers two specialised beauty categories. Browse what's available and find an artist near you.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 space-y-20">

        {/* Nails */}
        <section id="nails">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-pink-100">
              <Paintbrush2 className="size-6 text-pink-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nails</h2>
              <p className="text-gray-500">Gel, acrylic, nail art, extensions &amp; more</p>
            </div>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            From classic gel manicures to bespoke nail art, Sparq nail artists are skilled across
            a wide range of techniques. All artists are independently verified and carry their own
            professional-grade products.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {NAIL_SERVICES.map(({ name, description, duration }) => (
              <div
                key={name}
                className="rounded-xl border border-gray-100 bg-gray-50 p-5 hover:border-pink-200 hover:bg-pink-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <span className="shrink-0 rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-700">
                    {duration}
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Lashes */}
        <section id="lashes">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-100">
              <Eye className="size-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Lashes</h2>
              <p className="text-gray-500">Classic, hybrid, volume &amp; lash lifts</p>
            </div>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            Sparq lash technicians are certified professionals. Whether you want a subtle natural
            look or full mega-volume glamour, you'll find the right artist for your style.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {LASH_SERVICES.map(({ name, description, duration }) => (
              <div
                key={name}
                className="rounded-xl border border-gray-100 bg-gray-50 p-5 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {duration}
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coverage */}
        <section className="rounded-2xl bg-neutral-50 border border-neutral-200 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Suburbs we cover</h3>
          <p className="text-gray-500 mb-6 text-sm">
            Sparq launched across inner Melbourne with artists taking in-studio and mobile bookings.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {SUBURBS.map((suburb) => (
              <span
                key={suburb}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-3 py-1 text-sm text-neutral-700 font-medium"
              >
                <Check className="size-3" />
                {suburb}
              </span>
            ))}
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
          >
            Find an artist near you
            <ChevronRight className="size-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
