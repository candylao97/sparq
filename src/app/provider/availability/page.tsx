"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LAUNCH_SUBURBS } from "@/lib/constants";
import {
  providerLocationSchema,
  type ProviderLocationInput,
} from "@/server/validation/provider.schema";
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

const SERVICE_MODE_OPTIONS = [
  { value: "STUDIO", label: "Studio / Provider Location" },
  { value: "MOBILE", label: "Home Visit / Mobile" },
  { value: "BOTH", label: "Both" },
] as const;

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

interface DaySchedule {
  available: boolean;
  startTime: string;
  endTime: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function ProviderAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const [rules, setRules] = useState<AvailabilityRuleDTO[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverrideDTO[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateDTO[]>([]);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);

  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(() => {
    const init: Record<number, DaySchedule> = {};
    DAYS.forEach(({ value }) => {
      init[value] = { available: false, startTime: "09:00", endTime: "17:00" };
    });
    return init;
  });

  const {
    register,
    handleSubmit: handleLocationSubmit,
    control,
    watch,
    reset: resetLocation,
    formState: { errors: locationErrors },
  } = useForm<ProviderLocationInput>({
    resolver: zodResolver(providerLocationSchema),
    defaultValues: {
      serviceMode: "STUDIO",
      studioAddress: "",
      studioSuburb: "",
      mobileRadius: undefined,
      suburbs: [],
    },
  });

  const serviceMode = watch("serviceMode");

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

    const nextRules = Array.isArray(availData.rules) ? availData.rules : [];
    setRules(nextRules);
    setOverrides(Array.isArray(availData.overrides) ? availData.overrides : []);
    setBlockedDates(
      Array.isArray(availData.blockedDates) ? availData.blockedDates : []
    );

    const bookingsData = await bookingsRes.json();
    setBookings(Array.isArray(bookingsData) ? (bookingsData as BookingDTO[]) : []);

    const updated: Record<number, DaySchedule> = {};
    DAYS.forEach(({ value }) => {
      updated[value] = { available: false, startTime: "09:00", endTime: "17:00" };
    });
    nextRules.forEach((rule) => {
      updated[rule.dayOfWeek] = {
        available: true,
        startTime: rule.startTime,
        endTime: rule.endTime,
      };
    });
    setSchedule(updated);
  }, []);

  useEffect(() => {
    loadAvailability()
      .catch(() => toast.error("Failed to load availability"))
      .finally(() => setLoading(false));
  }, [loadAvailability]);

  useEffect(() => {
    fetch("/api/providers/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          resetLocation({
            serviceMode: (data.serviceMode as "STUDIO" | "MOBILE" | "BOTH") ?? "STUDIO",
            studioAddress: data.studioAddress ?? "",
            studioSuburb: data.studioSuburb ?? "",
            mobileRadius: data.mobileRadius ?? undefined,
            suburbs: data.suburbs ?? [],
          });
        }
      })
      .catch(() => {});
  }, [resetLocation]);

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

  async function onSaveLocation(data: ProviderLocationInput) {
    setSavingLocation(true);
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceMode: data.serviceMode,
          studioAddress: data.studioAddress,
          studioSuburb: data.studioSuburb,
          mobileRadius: data.mobileRadius,
          suburbs: data.suburbs,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("Location & coverage saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveSchedule() {
    setSaving(true);
    try {
      const nextRules = DAYS.filter(({ value }) => schedule[value]?.available).map(
        ({ value }) => ({
          dayOfWeek: value,
          startTime: schedule[value].startTime,
          endTime: schedule[value].endTime,
        })
      );

      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: nextRules }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      await loadAvailability();
      toast.success("Availability saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  function updateDay(dayValue: number, updates: Partial<DaySchedule>) {
    setSchedule((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], ...updates },
    }));
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
          Tap a day to set its hours and location, or adjust your weekly defaults below.
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

      {/* Default hours */}
      <Card>
        <CardHeader>
          <CardTitle>Default hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map(({ value, label }) => {
            const day = schedule[value];
            return (
              <div
                key={value}
                className="flex flex-col gap-3 border-b border-border py-2 last:border-0 sm:flex-row sm:items-center"
              >
                <div className="flex w-36 shrink-0 items-center gap-3">
                  <input
                    type="checkbox"
                    id={`day-${value}`}
                    checked={day.available}
                    onChange={(e) => updateDay(value, { available: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor={`day-${value}`} className="cursor-pointer">
                    {label}
                  </Label>
                </div>
                {day.available ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDay(value, { startTime: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => updateDay(value, { endTime: e.target.value })}
                      className="w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unavailable</span>
                )}
              </div>
            );
          })}
          <div className="pt-2">
            <Button onClick={saveSchedule} disabled={saving}>
              {saving ? "Saving..." : "Save schedule"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location & coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Location &amp; coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLocationSubmit(onSaveLocation)} className="space-y-6">
            {/* Service mode */}
            <Controller
              name="serviceMode"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Service mode</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {SERVICE_MODE_OPTIONS.map(({ value, label }) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition ${
                          field.value === value
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          value={value}
                          checked={field.value === value}
                          onChange={() => field.onChange(value)}
                        />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            />

            {(serviceMode === "STUDIO" || serviceMode === "BOTH") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="studioAddress">Studio address</Label>
                  <Input id="studioAddress" {...register("studioAddress")} />
                  {locationErrors.studioAddress && (
                    <p className="text-sm text-red-500">
                      {locationErrors.studioAddress.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studioSuburb">Studio suburb</Label>
                  <Input id="studioSuburb" {...register("studioSuburb")} />
                </div>
              </div>
            )}

            {(serviceMode === "MOBILE" || serviceMode === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="mobileRadius">Mobile radius (km)</Label>
                <Input
                  id="mobileRadius"
                  type="number"
                  min={1}
                  max={50}
                  {...register("mobileRadius", { valueAsNumber: true })}
                />
                {locationErrors.mobileRadius && (
                  <p className="text-sm text-red-500">
                    {locationErrors.mobileRadius.message}
                  </p>
                )}
              </div>
            )}

            {/* Service suburbs */}
            <div className="space-y-2">
              <Label>Service suburbs</Label>
              <Controller
                name="suburbs"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {LAUNCH_SUBURBS.map((suburb) => {
                      const checked = field.value.includes(suburb);
                      return (
                        <label
                          key={suburb}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                field.onChange(field.value.filter((s) => s !== suburb));
                              } else {
                                field.onChange([...field.value, suburb]);
                              }
                            }}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span className="text-sm">{suburb}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
              {locationErrors.suburbs && (
                <p className="text-sm text-red-500">{locationErrors.suburbs.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={savingLocation}>
                {savingLocation ? "Saving..." : "Save location"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
