"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

interface AvailabilityRule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BlockedDate {
  id: string;
  date: string;
  reason?: string | null;
}

interface DaySchedule {
  available: boolean;
  startTime: string;
  endTime: string;
}

export default function ProviderAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(() => {
    const init: Record<number, DaySchedule> = {};
    DAYS.forEach(({ value }) => {
      init[value] = { available: false, startTime: "09:00", endTime: "17:00" };
    });
    return init;
  });
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [addingDate, setAddingDate] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then(({ rules, blockedDates: bd }: { rules: AvailabilityRule[]; blockedDates: BlockedDate[] }) => {
        if (Array.isArray(rules)) {
          const updated: Record<number, DaySchedule> = {};
          DAYS.forEach(({ value }) => {
            updated[value] = { available: false, startTime: "09:00", endTime: "17:00" };
          });
          rules.forEach((rule) => {
            updated[rule.dayOfWeek] = {
              available: true,
              startTime: rule.startTime,
              endTime: rule.endTime,
            };
          });
          setSchedule(updated);
        }
        if (Array.isArray(bd)) {
          setBlockedDates(bd);
        }
      })
      .catch(() => toast.error("Failed to load availability"))
      .finally(() => setLoading(false));
  }, []);

  async function saveSchedule() {
    setSaving(true);
    try {
      const rules = DAYS
        .filter(({ value }) => schedule[value]?.available)
        .map(({ value }) => ({
          dayOfWeek: value,
          startTime: schedule[value].startTime,
          endTime: schedule[value].endTime,
        }));

      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("Availability saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  async function addBlockedDate() {
    if (!newDate) {
      toast.error("Please select a date");
      return;
    }
    setAddingDate(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, reason: newReason || undefined }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setBlockedDates((prev) => [...prev, created]);
      setNewDate("");
      setNewReason("");
      toast.success("Blocked date added");
    } catch {
      toast.error("Failed to add blocked date");
    } finally {
      setAddingDate(false);
    }
  }

  async function removeBlockedDate(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBlockedDates((prev) => prev.filter((d) => d.id !== id));
      toast.success("Blocked date removed");
    } catch {
      toast.error("Failed to remove blocked date");
    } finally {
      setRemovingId(null);
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
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Availability</h1>
        <p className="text-muted-foreground text-sm mt-1">Set your weekly schedule and blocked dates</p>
      </div>

      {/* Weekly schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map(({ value, label }) => {
            const day = schedule[value];
            return (
              <div key={value} className="flex flex-col sm:flex-row sm:items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3 w-36 shrink-0">
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
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDay(value, { startTime: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
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

      {/* Blocked dates */}
      <Card>
        <CardHeader>
          <CardTitle>Blocked dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {blockedDates.length > 0 && (
            <div className="divide-y divide-border">
              {blockedDates.map((bd) => (
                <div key={bd.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(bd.date), "EEEE, d MMMM yyyy")}
                    </p>
                    {bd.reason && (
                      <p className="text-xs text-muted-foreground">{bd.reason}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeBlockedDate(bd.id)}
                    disabled={removingId === bd.id}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">Add blocked date</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="newDate">Date</Label>
                <Input
                  id="newDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="newReason">Reason (optional)</Label>
                <Input
                  id="newReason"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g. Public holiday"
                />
              </div>
            </div>
            <Button onClick={addBlockedDate} disabled={addingDate} variant="outline">
              <Plus className="size-4 mr-1.5" />
              {addingDate ? "Adding..." : "Add blocked date"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
