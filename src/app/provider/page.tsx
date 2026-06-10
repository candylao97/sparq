"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { orderProviderBookings } from "@/lib/provider-dashboard";
import type { BookingWithDetails } from "@/types";

type StatusVariant = "yellow" | "blue" | "green" | "red" | "gray";

function getStatusVariant(status: string): StatusVariant {
  const map: Record<string, StatusVariant> = {
    PENDING_PROVIDER_RESPONSE: "yellow",
    CONFIRMED: "blue",
    COMPLETED: "green",
    DECLINED: "red",
    CANCELLED_BY_CUSTOMER: "gray",
    CANCELLED_BY_PROVIDER: "gray",
    REFUNDED: "gray",
    EXPIRED: "gray",
    DISPUTED: "red",
  };
  return map[status] ?? "gray";
}

export default function ProviderOverviewPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const orderedBookings = orderProviderBookings(bookings);

  async function respond(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "accept" ? "Booking accepted" : "Booking declined");
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: action === "accept" ? "CONFIRMED" : "DECLINED" }
            : b
        )
      );
    } catch {
      toast.error("Failed to respond to booking");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back to your provider dashboard
        </p>
      </div>

      {/* Recent booking requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent booking requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            renderSkeleton()
          ) : orderedBookings.length === 0 ? (
            renderEmptyState()
          ) : (
            <ul className="divide-y divide-border">
              {orderedBookings.map((booking) => renderBookingRow(booking))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function renderSkeleton() {
    return (
      <div className="divide-y divide-border" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="py-4 flex items-start justify-between gap-4 first:pt-0"
          >
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3.5 w-56 rounded bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-32 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  function renderEmptyState() {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No bookings yet</p>
          <p className="text-sm text-muted-foreground">
            New booking requests from customers will appear here.
          </p>
        </div>
      </div>
    );
  }

  function renderBookingRow(booking: BookingWithDetails) {
    const isPending = booking.status === "PENDING_PROVIDER_RESPONSE";
    const isResponding = respondingId === booking.id;
    const customerName = booking.customer?.name ?? "Unknown customer";
    const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;

    return (
      <li
        key={booking.id}
        className={`flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between ${
          isPending
            ? "-mx-3 rounded-lg bg-yellow-50/60 sm:my-1"
            : "first:pt-0 last:pb-0"
        }`}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{customerName}</span>
            <Badge variant={getStatusVariant(booking.status)}>
              <span className="sr-only">Status: </span>
              {statusLabel}
            </Badge>
          </div>
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">
              {booking.service?.title} &middot;{" "}
              {format(new Date(booking.bookingDate), "d MMM yyyy")} at{" "}
              {booking.startTime}
            </span>
          </p>
          <p className="text-sm font-semibold tabular-nums">
            ${(booking.totalPrice ?? 0).toFixed(2)}
          </p>
        </div>
        {isPending && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              onClick={() => respond(booking.id, "accept")}
              disabled={isResponding}
              aria-label={`Accept booking from ${customerName}`}
              className="flex-1 sm:flex-none"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => respond(booking.id, "decline")}
              disabled={isResponding}
              aria-label={`Decline booking from ${customerName}`}
              className="flex-1 sm:flex-none"
            >
              Decline
            </Button>
          </div>
        )}
      </li>
    );
  }
}
