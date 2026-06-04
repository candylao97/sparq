import Link from "next/link";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/types";

const SERVICE_LABEL: Record<string, string> = {
  NAILS: "Nails",
  LASHES: "Lashes",
};

const MODE_LABEL: Record<string, string> = {
  STUDIO: "Studio",
  MOBILE: "Mobile",
};

export function ProviderCard({ provider }: { provider: ProviderCardType }) {
  const displayName = provider.businessName || provider.name;
  const modeLabel =
    MODE_LABEL[provider.serviceMode] ?? "Studio & Mobile";

  return (
    <Link
      href={`/providers/${provider.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        {provider.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={provider.image}
            alt={displayName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
            <span className="text-5xl font-bold text-indigo-300">
              {displayName.charAt(0)}
            </span>
          </div>
        )}

        {/* Rating chip */}
        {provider.avgRating != null && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            {provider.avgRating.toFixed(1)}
            <span className="font-normal text-neutral-400">
              ({provider.reviewCount})
            </span>
          </div>
        )}

        {/* Service-type chips */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {provider.serviceTypes.map((type) => (
            <span
              key={type}
              className="rounded-full bg-neutral-900/80 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur"
            >
              {SERVICE_LABEL[type] ?? type}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-semibold leading-snug text-neutral-900">
            <span className="truncate">{displayName}</span>
            {provider.isApproved && (
              <BadgeCheck className="size-4 shrink-0 text-indigo-600" />
            )}
          </h3>
        </div>

        <div className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">
            {provider.suburbs.slice(0, 2).join(", ")}
            {provider.suburbs.length > 2 &&
              ` +${provider.suburbs.length - 2}`}
          </span>
          <span className="text-neutral-300">·</span>
          <span className="shrink-0">{modeLabel}</span>
        </div>

        {provider.bio && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">
            {provider.bio}
          </p>
        )}

        {/* Footer: price + CTA */}
        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
          <div>
            {provider.priceFrom != null ? (
              <p className="text-sm text-neutral-500">
                From{" "}
                <span className="text-base font-semibold text-neutral-900">
                  ${provider.priceFrom}
                </span>
              </p>
            ) : (
              <p className="text-sm text-neutral-400">View services</p>
            )}
          </div>
          <span className="inline-flex items-center rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors group-hover:bg-neutral-700">
            Book
          </span>
        </div>
      </div>
    </Link>
  );
}
