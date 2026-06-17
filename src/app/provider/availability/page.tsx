"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { AvailabilityCalendar } from "@/components/provider/availability-calendar";
import {
  AvailabilityDayPanel,
  type SaveDayPayload,
} from "@/components/provider/availability-day-panel";
import {
  buildDayMaps,
  effectiveDayFor,
  type AvailabilityOverrideDTO,
  type AvailabilityRuleDTO,
  type BlockedDateDTO,
  type BookingDTO,
} from "@/components/provider/availability-utils";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function ProviderAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(false);

  const [rules, setRules] = useState<AvailabilityRuleDTO[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverrideDTO[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateDTO[]>([]);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);

  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const maps = useMemo(
    () => buildDayMaps(rules, overrides, bookings, blockedDates),
    [rules, overrides, bookings, blockedDates]
  );

  const loadAvailability = useCallback(async () => {
    const [availRes, bookingsRes] = await Promise.all([
      fetch("/api/availability"),
      fetch("/api/bookings"),
    ]);

    const availData: {
      rules?: AvailabilityRuleDTO[];
      overrides?: AvailabilityOverrideDTO[];
      blockedDates?: BlockedDateDTO[];
    } = await availRes.json();

    setRules(Array.isArray(availData.rules) ? availData.rules : []);
    setOverrides(Array.isArray(availData.overrides) ? availData.overrides : []);
    setBlockedDates(
      Array.isArray(availData.blockedDates) ? availData.blockedDates : []
    );

    const bookingsData = await bookingsRes.json();
    setBookings(Array.isArray(bookingsData) ? (bookingsData as BookingDTO[]) : []);
  }, []);

  useEffect(() => {
    loadAvailability()
      .catch(() => toast.error("Failed to load availability"))
      .finally(() => setLoading(false));
  }, [loadAvailability]);

  async function handleSaveDay(payload: SaveDayPayload) {
    setSavingDay(true);
    try {
      const res = await fetch("/api/availability/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Save failed");
      }
      await loadAvailability();
      toast.success("Day updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save day");
    } finally {
      setSavingDay(false);
    }
  }

  async function handleApplyToWeekday(
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ) {
    setSavingDay(true);
    try {
      const res = await fetch("/api/availability/weekday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, startTime, endTime }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Save failed");
      }
      await loadAvailability();
      toast.success("Weekly default updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update default");
    } finally {
      setSavingDay(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Loading availability...</p>
      </div>
    );
  }

  const selectedEffective = selectedDate ? effectiveDayFor(selectedDate, maps) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a day to set its hours and location. Use &ldquo;Apply to all
          &hellip;&rdquo; in the day panel to set that weekday&rsquo;s default
          going forward.
        </p>
      </div>

      {/* Calendar + day panel */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card className="lg:flex-1">
          <CardContent className="pt-6">
            <AvailabilityCalendar
              monthAnchor={monthAnchor}
              onMonthChange={setMonthAnchor}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              maps={maps}
            />
          </CardContent>
        </Card>

        {/* Desktop side panel */}
        {selectedDate && selectedEffective && (
          <Card className="hidden w-80 shrink-0 lg:block lg:sticky lg:top-8">
            <CardContent className="pt-6">
              <AvailabilityDayPanel
                key={selectedDate.toDateString()}
                date={selectedDate}
                effective={selectedEffective}
                bookings={bookings}
                saving={savingDay}
                onClose={() => setSelectedDate(null)}
                onSaveDay={handleSaveDay}
                onApplyToWeekday={handleApplyToWeekday}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {selectedDate && selectedEffective && (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
          <div
            className="max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-5 shadow-2xl"
            role="dialog"
            aria-modal="false"
            aria-label="Day availability"
          >
            <AvailabilityDayPanel
              key={selectedDate.toDateString()}
              date={selectedDate}
              effective={selectedEffective}
              bookings={bookings}
              saving={savingDay}
              onClose={() => setSelectedDate(null)}
              onSaveDay={handleSaveDay}
              onApplyToWeekday={handleApplyToWeekday}
            />
          </div>
        </div>
      )}
    </div>
  );
}
