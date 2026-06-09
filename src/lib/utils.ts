import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an amount given in cents as AUD currency using the en-AU locale.
 * Pass `options` to override fraction-digit settings per call site.
 */
export function formatCurrency(
  cents: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    ...options,
  }).format(cents / 100)
}
