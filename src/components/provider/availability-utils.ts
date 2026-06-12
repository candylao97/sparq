import {
  dateKey,
  dateKeyUTC,
  resolveEffectiveDay,
  type EffectiveDay,
} from "@/lib/availability";

/**
 * Wire shapes for the Stage-1 availability backend, as returned by
 * GET /api/availability and GET /api/bookings (dates arrive as ISO strings).
 */
export interface AvailabilityRuleDTO {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilityOverrideDTO {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  serviceMode: string | null;
}

export interface BookingDTO {
  id: string;
  bookingDate: string;
  startTime: string;
  status: string;
  service?: { title?: string | null } | null;
  customer?: { name?: string | null } | null;
}

/**
 * Legacy per-date block, as returned in the `blockedDates` array of GET
 * /api/availability. No current UI creates these rows, but pre-existing ones are
 * still honoured by the booking engine (`getAvailableSlots` returns no slots for
 * a blocked date), so the calendar must render them as closed to stay truthful.
 */
export interface BlockedDateDTO {
  date: string;
}

/**
 * Booking statuses that occupy a slot for availability purposes. DECLINED,
 * EXPIRED, CANCELLED_* and REFUNDED bookings no longer hold the day.
 */
const ACTIVE_BOOKING_STATUSES = new Set([
  "PENDING_PROVIDER_RESPONSE",
  "CONFIRMED",
  "COMPLETED",
]);

export interface DayMaps {
  ruleByWeekday: Map<number, { startTime: string; endTime: string }>;
  overrideByDateKey: Map<
    string,
    {
      isAvailable: boolean;
      startTime: string | null;
      endTime: string | null;
      serviceMode: string | null;
    }
  >;
  bookingCountByDateKey: Map<string, number>;
  /** Date keys with a legacy BlockedDate row; these days are closed to bookings. */
  blockedDateKeys: Set<string>;
}

/**
 * Builds the per-day lookup Maps consumed by `resolveEffectiveDay` from the raw
 * wire payloads. @db.Date values (override.date, bookingDate) are materialised at
 * UTC midnight, so they are keyed with `dateKeyUTC` to line up with the local
 * `dateKey` of the calendar's local-midnight grid cells.
 */
export function buildDayMaps(
  rules: AvailabilityRuleDTO[],
  overrides: AvailabilityOverrideDTO[],
  bookings: BookingDTO[],
  blockedDates: BlockedDateDTO[] = []
): DayMaps {
  const ruleByWeekday = new Map<number, { startTime: string; endTime: string }>();
  for (const rule of rules) {
    ruleByWeekday.set(rule.dayOfWeek, {
      startTime: rule.startTime,
      endTime: rule.endTime,
    });
  }

  const overrideByDateKey = new Map<
    string,
    {
      isAvailable: boolean;
      startTime: string | null;
      endTime: string | null;
      serviceMode: string | null;
    }
  >();
  for (const override of overrides) {
    overrideByDateKey.set(dateKeyUTC(new Date(override.date)), {
      isAvailable: override.isAvailable,
      startTime: override.startTime,
      endTime: override.endTime,
      serviceMode: override.serviceMode,
    });
  }

  const bookingCountByDateKey = new Map<string, number>();
  for (const booking of bookings) {
    if (!ACTIVE_BOOKING_STATUSES.has(booking.status)) continue;
    const key = dateKeyUTC(new Date(booking.bookingDate));
    bookingCountByDateKey.set(key, (bookingCountByDateKey.get(key) ?? 0) + 1);
  }

  // BlockedDate.date is @db.Date (materialised at UTC midnight), so key it with
  // `dateKeyUTC` to line up with the local `dateKey` of the grid cells.
  const blockedDateKeys = new Set<string>();
  for (const blocked of blockedDates) {
    blockedDateKeys.add(dateKeyUTC(new Date(blocked.date)));
  }

  return { ruleByWeekday, overrideByDateKey, bookingCountByDateKey, blockedDateKeys };
}

/**
 * Resolves the effective day for a local-midnight grid cell using prebuilt maps.
 *
 * A legacy BlockedDate row WINS over rules and overrides: the booking engine
 * (`getAvailableSlots`) returns no slots for a blocked date regardless of the
 * weekly default, so the calendar renders it as a closed "Day off" to match.
 */
export function effectiveDayFor(date: Date, maps: DayMaps): EffectiveDay {
  const effective = resolveEffectiveDay(
    date,
    maps.ruleByWeekday,
    maps.overrideByDateKey,
    maps.bookingCountByDateKey
  );

  if (maps.blockedDateKeys.has(dateKey(date))) {
    return {
      ...effective,
      state: "unavailable",
      isAvailable: false,
      startTime: null,
      endTime: null,
      serviceMode: null,
    };
  }

  return effective;
}

/**
 * Returns the active bookings for a given local-midnight grid cell, sorted by
 * start time, with status filtering matching the booking-count map.
 */
export function bookingsForDate(date: Date, bookings: BookingDTO[]): BookingDTO[] {
  const key = dateKey(date);
  return bookings
    .filter(
      (b) =>
        ACTIVE_BOOKING_STATUSES.has(b.status) &&
        dateKeyUTC(new Date(b.bookingDate)) === key
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Full weekday name for a 0–6 day-of-week index (0 = Sunday). */
export function weekdayLabel(dayOfWeek: number): string {
  return WEEKDAY_LABELS[((dayOfWeek % 7) + 7) % 7];
}

/** Pluralised weekday name for the "Apply to all …" action, e.g. "Mondays". */
export function weekdayPlural(dayOfWeek: number): string {
  return `${weekdayLabel(dayOfWeek)}s`;
}

/**
 * Returns the calendar grid (always 6 rows × 7 cols = 42 cells) for the month
 * containing `monthAnchor`, weeks starting on Sunday. Cells outside the month
 * are included so the grid is fully padded.
 */
export function buildMonthGrid(monthAnchor: Date): Date[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}
