"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { LAUNCH_SUBURBS, SERVICE_CATEGORIES } from "@/lib/constants";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 rounded-full border border-neutral-200 bg-white px-4 text-sm text-neutral-700 transition-colors hover:border-neutral-300 focus:border-neutral-900 focus:outline-none";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/providers?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    router.push("/providers");
  };

  const hasFilters = searchParams.toString().length > 0;
  const activeCategory = searchParams.get("category");

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-neutral-100 bg-white/90 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="space-y-3">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search artists, services…"
              className="h-11 rounded-full border-neutral-200 pl-11 text-base"
              defaultValue={searchParams.get("keyword") || ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateFilter("keyword", e.currentTarget.value);
                }
              }}
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full px-3 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              <X className="size-4" />
              Clear
            </button>
          )}
        </div>

        {/* Category pills + selects */}
        <div className="flex flex-wrap items-center gap-2">
          {SERVICE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.toUpperCase();
            return (
              <button
                key={cat}
                onClick={() =>
                  updateFilter("category", isActive ? "" : cat.toUpperCase())
                }
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                )}
              >
                {cat}
              </button>
            );
          })}

          <span className="mx-1 hidden h-6 w-px bg-neutral-200 sm:block" />

          <select
            className={selectClass}
            value={searchParams.get("suburb") || ""}
            onChange={(e) => updateFilter("suburb", e.target.value)}
          >
            <option value="">All suburbs</option>
            {LAUNCH_SUBURBS.map((suburb) => (
              <option key={suburb} value={suburb}>
                {suburb}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={searchParams.get("serviceMode") || ""}
            onChange={(e) => updateFilter("serviceMode", e.target.value)}
          >
            <option value="">Any mode</option>
            <option value="STUDIO">Studio</option>
            <option value="MOBILE">Mobile</option>
          </select>

          <select
            className={selectClass}
            value={searchParams.get("minRating") || ""}
            onChange={(e) => updateFilter("minRating", e.target.value)}
          >
            <option value="">Any rating</option>
            <option value="4">4+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </select>
        </div>
      </div>
    </div>
  );
}
