/**
 * Batch B Item 5 — Address validation (Option C, pre-Places).
 *
 * Two distinct validators, mirrored client + server so both layers agree
 * on "Point Cook" (bare suburb) being rejected.
 *
 * Shape of a valid **booking address** (customer → artist at home):
 *   - Optional prefix (Unit/Level/Shop/Flat/Apt/Apartment/Suite/Lot + number)
 *   - Street number (digits, optional letter suffix, optional /N for subdivisions)
 *   - At least 2 more chars for street name + suburb
 *   - Overall min length 10 chars (matches prior server check at
 *     src/app/api/bookings/route.ts:108 — kept verbatim so the existing
 *     server gate stays functionally identical).
 *
 * Shape of a valid **artist service area** (artist onboarding "Where will you
 * offer your service?" field):
 *   - "<Suburb>[,] <STATE> <postcode>" — suburb + AU state (NSW/VIC/QLD/SA/
 *     WA/TAS/NT/ACT) + 4-digit postcode.
 *   - Comma between suburb and state is optional (Google Places sometimes
 *     returns with, sometimes without).
 *   - Rejects "Point Cook" on its own — that was the documented bug.
 *
 * Neither validator guarantees the address EXISTS; they just enforce
 * structural shape. Google Places autocomplete (deferred to a follow-up)
 * would add existence checking. For now, structure-only is enough to stop
 * bare-suburb submissions and typos.
 */

// Matches the existing server-side regex at bookings/route.ts:108 verbatim.
export const BOOKING_ADDRESS_REGEX =
  /^(?:(?:unit|level|shop|flat|apt|apartment|suite|lot)\s+[\w/-]+[,\s]+)?\d+[a-z]?(?:[/-]\d+)?\s+\S.{2,}/i

const AU_STATES = 'NSW|VIC|QLD|SA|WA|TAS|NT|ACT'
// Suburb: at least 2 chars, allows spaces/hyphens/apostrophes.
//   "Suburb, STATE 3000" | "Suburb STATE 3000"
export const SERVICE_AREA_REGEX = new RegExp(
  `^[A-Za-z][A-Za-z '\\-]{1,}(?:,\\s*|\\s+)(?:${AU_STATES})\\s+\\d{4}$`,
  'i',
)

/**
 * Returns true if the string looks like a real street address.
 * Empty / too short / bare suburb → false.
 */
export function isValidBookingAddress(raw: string | null | undefined): boolean {
  if (!raw) return false
  const trimmed = raw.trim()
  if (trimmed.length < 10) return false
  return BOOKING_ADDRESS_REGEX.test(trimmed)
}

/**
 * Returns true if the string looks like "Suburb, STATE postcode".
 * Accepts the brief's example "Point Cook, VIC 3030".
 * Rejects "Point Cook" alone.
 */
export function isValidServiceArea(raw: string | null | undefined): boolean {
  if (!raw) return false
  return SERVICE_AREA_REGEX.test(raw.trim())
}
