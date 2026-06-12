import { prisma } from "@/lib/prisma";
import type { ServiceMode } from "@prisma/client";
import { addMinutes, format, parse, isBefore } from "date-fns";
import { dateKey, resolveEffectiveDay } from "@/lib/availability";

export async function getAvailabilityRules(profileId: string) {
  return prisma.availabilityRule.findMany({
    where: { profileId },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function setAvailabilityRules(
  profileId: string,
  rules: { dayOfWeek: number; startTime: string; endTime: string }[]
) {
  await prisma.availabilityRule.deleteMany({ where: { profileId } });

  if (rules.length > 0) {
    await prisma.availabilityRule.createMany({
      data: rules.map((rule) => ({ ...rule, profileId })),
    });
  }

  return getAvailabilityRules(profileId);
}

export async function getBlockedDates(profileId: string) {
  return prisma.blockedDate.findMany({
    where: { profileId, date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });
}

export async function addBlockedDate(
  profileId: string,
  date: string,
  reason?: string
) {
  return prisma.blockedDate.create({
    data: {
      profileId,
      date: new Date(date),
      reason,
    },
  });
}

export async function removeBlockedDate(profileId: string, dateId: string) {
  return prisma.blockedDate.delete({
    where: { id: dateId, profileId },
  });
}

export async function getAvailabilityOverrides(profileId: string) {
  return prisma.availabilityOverride.findMany({
    where: { profileId },
    orderBy: { date: "asc" },
  });
}

export async function upsertAvailabilityOverride(
  profileId: string,
  data: {
    date: string;
    isAvailable: boolean;
    startTime?: string | null;
    endTime?: string | null;
    serviceMode?: ServiceMode | null;
  }
) {
  const date = new Date(data.date);
  const fields = {
    isAvailable: data.isAvailable,
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    serviceMode: data.serviceMode ?? null,
  };

  return prisma.availabilityOverride.upsert({
    where: { profileId_date: { profileId, date } },
    create: { profileId, date, ...fields },
    update: fields,
  });
}

export async function deleteAvailabilityOverride(profileId: string, date: string) {
  // deleteMany keeps this idempotent — deleting a non-existent override is a no-op.
  return prisma.availabilityOverride.deleteMany({
    where: { profileId, date: new Date(date) },
  });
}

export async function applyHoursToWeekday(
  profileId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  // Replace the recurring default for this single weekday only. Wrapped in a
  // transaction so the delete+create is atomic: if the create fails, the delete
  // rolls back and the weekday keeps its existing rule instead of silently
  // flipping to 'off' (resolveEffectiveDay treats a no-rule weekday as
  // unavailable).
  const [, created] = await prisma.$transaction([
    prisma.availabilityRule.deleteMany({ where: { profileId, dayOfWeek } }),
    prisma.availabilityRule.create({
      data: { profileId, dayOfWeek, startTime, endTime },
    }),
  ]);

  return created;
}

export async function getAvailableSlots(
  profileId: string,
  date: string,
  durationMinutes: number
): Promise<string[]> {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  // Check if date is blocked
  const blocked = await prisma.blockedDate.findFirst({
    where: {
      profileId,
      date: targetDate,
    },
  });

  if (blocked) return [];

  // Get the weekly default rules for this weekday and any per-date override.
  const [rules, override] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { profileId, dayOfWeek } }),
    prisma.availabilityOverride.findUnique({
      where: { profileId_date: { profileId, date: targetDate } },
    }),
  ]);

  // Resolve the effective availability for this exact day so the customer-facing
  // engine honours overrides saved via the calendar (day off / narrowed hours /
  // serviceMode) instead of always falling back to the weekly default rule.
  // Both `targetDate` and `override.date` are UTC-midnight Dates, so keying the
  // override map with `dateKey(targetDate)` aligns with the lookup
  // resolveEffectiveDay performs internally — no timezone skew between them.
  const ruleByWeekday = new Map<number, { startTime: string; endTime: string }>();
  const firstRule = rules[0];
  if (firstRule) {
    ruleByWeekday.set(dayOfWeek, {
      startTime: firstRule.startTime,
      endTime: firstRule.endTime,
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
  if (override) {
    overrideByDateKey.set(dateKey(targetDate), {
      isAvailable: override.isAvailable,
      startTime: override.startTime,
      endTime: override.endTime,
      serviceMode: override.serviceMode,
    });
  }

  // Bookings only affect slot conflicts here, not the day's open/closed state,
  // so resolveEffectiveDay is given an empty booking map.
  const effective = resolveEffectiveDay(
    targetDate,
    ruleByWeekday,
    overrideByDateKey,
    new Map()
  );

  // A day turned off (override isAvailable:false, or simply no rule) yields no
  // bookable slots.
  if (!effective.isAvailable) return [];

  // An override collapses the day to its single resolved window (override hours,
  // falling back to the weekday rule hours). Without an override, keep every
  // weekly rule so split shifts still generate slots.
  const windows = effective.hasOverride
    ? effective.startTime && effective.endTime
      ? [{ startTime: effective.startTime, endTime: effective.endTime }]
      : []
    : rules.map((rule) => ({ startTime: rule.startTime, endTime: rule.endTime }));

  if (windows.length === 0) return [];

  // Get existing bookings for this date
  const existingBookings = await prisma.booking.findMany({
    where: {
      providerId: profileId,
      bookingDate: targetDate,
      status: {
        in: ["PENDING_PROVIDER_RESPONSE", "CONFIRMED"],
      },
    },
    select: { startTime: true, endTime: true },
  });

  const slots: string[] = [];
  const slotInterval = 30; // 30-minute intervals

  for (const window of windows) {
    let current = parse(window.startTime, "HH:mm", targetDate);
    const windowEnd = parse(window.endTime, "HH:mm", targetDate);

    while (true) {
      const slotEnd = addMinutes(current, durationMinutes);

      // Stop once a slot would run past the window's end (a slot ending exactly
      // at windowEnd is still allowed).
      if (isBefore(windowEnd, slotEnd)) {
        break;
      }

      // Check for conflicts with existing bookings
      const slotStartStr = format(current, "HH:mm");
      const slotEndStr = format(slotEnd, "HH:mm");

      const hasConflict = existingBookings.some((booking) => {
        return slotStartStr < booking.endTime && slotEndStr > booking.startTime;
      });

      if (!hasConflict) {
        slots.push(slotStartStr);
      }

      current = addMinutes(current, slotInterval);
    }
  }

  return slots;
}
