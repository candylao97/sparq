import { prisma } from "@/lib/prisma";
import { addMinutes, format, parse, isBefore, isEqual } from "date-fns";

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

  // Get availability rules for this day
  const rules = await prisma.availabilityRule.findMany({
    where: { profileId, dayOfWeek },
  });

  if (rules.length === 0) return [];

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

  for (const rule of rules) {
    let current = parse(rule.startTime, "HH:mm", targetDate);
    const ruleEnd = parse(rule.endTime, "HH:mm", targetDate);

    while (true) {
      const slotEnd = addMinutes(current, durationMinutes);

      if (isBefore(ruleEnd, slotEnd) || isEqual(ruleEnd, slotEnd) === false && isBefore(ruleEnd, slotEnd)) {
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
