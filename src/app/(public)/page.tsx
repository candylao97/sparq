import type { Metadata } from "next";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Sparq | Find Trusted Nail & Lash Artists in Melbourne",
  description:
    "Sparq connects you with verified nail and lash artists across Melbourne. Browse, book, and pay securely — all in one place.",
};

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
    <div className="bg-neutral-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-neutral-50">
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center px-5 py-20 text-center sm:px-6">
          <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
            Book beauty,
            <br />
            beautifully.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-600 sm:mt-6 sm:text-lg">
            Sparq connects you with verified nail &amp; lash artists across
            Melbourne. Browse, book online, and pay securely — all in one place.
          </p>

          {/* Search */}
          <form
            action="/providers"
            className="group mx-auto mt-9 flex w-full max-w-xl items-center gap-2 rounded-full border border-neutral-200 bg-white p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] transition-shadow focus-within:border-neutral-300 focus-within:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3)] sm:mt-10"
          >
            <div className="relative flex-1">
              <label htmlFor="home-search" className="sr-only">
                Search artists, services or suburbs
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
              />
              <input
                id="home-search"
                name="keyword"
                type="search"
                placeholder="Search artists, services or suburbs"
                className="h-12 w-full rounded-full bg-transparent pl-12 pr-3 text-base text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 [&::-webkit-search-cancel-button]:appearance-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-5 text-base font-semibold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-neutral-800 sm:px-6"
            >
              Search
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </form>

          {/* Suburb quick-links */}
          <div className="mt-7 flex flex-wrap justify-center gap-2 sm:mt-8">
            {SUBURBS.map((suburb) => (
              <Link
                key={suburb}
                href={`/providers?suburb=${encodeURIComponent(suburb)}`}
                className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50"
              >
                {suburb}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
