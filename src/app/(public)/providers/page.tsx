import type { Metadata } from "next";
import { searchProviders } from "@/server/services/provider.service";
import { ProviderCard } from "@/components/providers/provider-card";
import { FilterBar } from "@/components/providers/filter-bar";

export const metadata: Metadata = {
  title: "Find Nail & Lash Artists | Sparq",
  description: "Browse and book trusted nail and lash artists in Melbourne CBD and inner suburbs.",
};

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const filters = {
    keyword: params.keyword,
    category: params.category,
    suburb: params.suburb,
    serviceMode: params.serviceMode,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    minRating: params.minRating ? Number(params.minRating) : undefined,
    page: params.page ? Number(params.page) : 1,
  };

  const { providers, total } = await searchProviders(filters);
  const totalPages = Math.ceil(total / 12);
  const currentPage = filters.page || 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
          Find your artist
        </h1>
        <p className="mt-3 text-lg text-neutral-500">
          Browse verified nail &amp; lash artists across Melbourne CBD and the
          inner suburbs.
        </p>
      </div>

      <FilterBar />

      <div className="mt-8">
        <p className="mb-5 text-sm font-medium text-neutral-500">
          {total} {total === 1 ? "artist" : "artists"} available
        </p>

        {providers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-20 text-center">
            <p className="text-lg font-medium text-neutral-700">
              No artists match your search
            </p>
            <p className="mt-1 text-neutral-400">
              Try adjusting your filters or clearing them to start again.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <a
                key={page}
                href={`/providers?${new URLSearchParams({
                  ...params,
                  page: page.toString(),
                } as Record<string, string>).toString()}`}
                className={`inline-flex size-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  page === currentPage
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {page}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
