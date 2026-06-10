/**
 * Pure (no DB/IO) helpers for resolving an artist's effective availability for a
 * given calendar day. The "weekly default" comes from AvailabilityRule rows and
 * a per-date AvailabilityOverride (when present) WINS over that default.
 */

export type DayState = "available" | "partial" | "unavailable";

export interface EffectiveDay {
  state: DayState;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  serviceMode: string | null;
  hasOverride: boolean;
}

interface WeekdayRule {
  startTime: string;
  endTime: string;
}

interface OverrideForDay {
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  serviceMode: string | null;
}

/**
 * Returns a local "yyyy-MM-dd" key for a Date, using local calendar components
 * (not UTC). Use this for Date objects the UI constructs at LOCAL midnight
 * (e.g. `new Date(year, monthIndex, day)`) — i.e. the calendar grid cells.
 *
 * Do NOT use this for @db.Date values. Prisma materializes a @db.Date as a Date
 * at UTC midnight, so in a negative-UTC-offset timezone its local components
 * point at the previous calendar day. Key those with `dateKeyUTC` instead.
 */
export function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns a "yyyy-MM-dd" key from a Date's UTC calendar components. Use this for
 * @db.Date values (override.date, bookingDate), which Prisma materializes at UTC
 * midnight. Reading those with UTC components yields the calendar day the value
 * actually represents, so the key matches the local `dateKey` of the UI's
 * local-midnight grid cell for that same day — regardless of the host timezone.
 *
 * The write path stores @db.Date as `new Date("yyyy-MM-dd")` (UTC midnight), so
 * this read key round-trips with what was written.
 */
export function dateKeyUTC(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the effective availability for a single date.
 *
 * Resolution order:
 *  - If an override exists for the date's key, it WINS:
 *      isAvailable  = override.isAvailable
 *      hours        = override hours ?? weekday rule hours ?? null
 *      serviceMode  = override.serviceMode ?? null
 *      hasOverride  = true
 *  - Otherwise the weekly default applies:
 *      isAvailable  = a rule exists for that weekday
 *      hours        = rule hours ?? null
 *      serviceMode  = null
 *      hasOverride  = false
 *
 * State (exactly three): !isAvailable -> "unavailable";
 * else bookingCount > 0 -> "partial"; else -> "available".
 *
 * KEY CONVENTION CONTRACT: `overrideByDateKey` and `bookingCountByDateKey` MUST
 * be keyed with the SAME calendar-day convention as `dateKey(date)`. This helper
 * looks both maps up by `dateKey(date)` (the local components of the `date`
 * argument). The intended caller iterates local-midnight grid cells (so `date`
 * is `new Date(year, monthIndex, day)`), and builds the override/booking maps
 * from Prisma @db.Date rows (override.date, bookingDate) — which Prisma
 * materializes at UTC midnight. Those rows MUST therefore be keyed with
 * `dateKeyUTC` so their keys align with the local `dateKey` of the grid cell for
 * the same calendar day. Keying @db.Date rows with the local `dateKey` instead
 * would roll them back a day in negative-UTC-offset timezones and resolve the
 * override/bookings onto the wrong cell.
 */
export function resolveEffectiveDay(
  date: Date,
  ruleByWeekday: Map<number, WeekdayRule>,
  overrideByDateKey: Map<string, OverrideForDay>,
  bookingCountByDateKey: Map<string, number>
): EffectiveDay {
  const key = dateKey(date);
  const rule = ruleByWeekday.get(date.getDay());
  const override = overrideByDateKey.get(key);

  let isAvailable: boolean;
  let startTime: string | null;
  let endTime: string | null;
  let serviceMode: string | null;
  let hasOverride: boolean;

  if (override) {
    isAvailable = override.isAvailable;
    startTime = override.startTime ?? rule?.startTime ?? null;
    endTime = override.endTime ?? rule?.endTime ?? null;
    serviceMode = override.serviceMode ?? null;
    hasOverride = true;
  } else {
    isAvailable = rule !== undefined;
    startTime = rule?.startTime ?? null;
    endTime = rule?.endTime ?? null;
    serviceMode = null;
    hasOverride = false;
  }

  const bookingCount = bookingCountByDateKey.get(key) ?? 0;

  let state: DayState;
  if (!isAvailable) {
    state = "unavailable";
  } else if (bookingCount > 0) {
    state = "partial";
  } else {
    state = "available";
  }

  return { state, isAvailable, startTime, endTime, serviceMode, hasOverride };
}
