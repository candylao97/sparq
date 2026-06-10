/**
 * Pure presentational helpers for the settings pages.
 * No side effects — safe to unit test and use in client components.
 */

/** Split a single display name into first/last parts. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");
  return { firstName, lastName };
}

/** Recombine first/last parts into a single trimmed display name. */
export function joinName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** Mask a bank account number, revealing only the last 4 digits. */
export function maskAccountNumber(accountNumber: string): string {
  const digits = (accountNumber ?? "").replace(/\s+/g, "");
  if (!digits) return "";
  const last4 = digits.slice(-4);
  return `•••• ${last4}`;
}

/** Mask a BSB, revealing nothing of the underlying value. */
export function maskBsb(bsb: string): string {
  if (!(bsb ?? "").trim()) return "";
  return "•••-•••";
}
