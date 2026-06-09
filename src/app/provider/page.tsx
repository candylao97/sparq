"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
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
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back to your provider dashboard</p>
      </div>

      {/* Recent booking requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent booking requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : orderedBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {orderedBookings.map((booking) => renderBookingRow(booking))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function renderBookingRow(booking: BookingWithDetails) {
    return (
      <div
        key={booking.id}
        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {booking.customer?.name ?? "Unknown customer"}
            </span>
            <Badge variant={getStatusVariant(booking.status)}>
              {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.service?.title} &middot;{" "}
            {format(new Date(booking.bookingDate), "d MMM yyyy")} at {booking.startTime}
          </p>
          <p className="text-sm font-medium">
            ${(booking.totalPrice ?? 0).toFixed(2)}
          </p>
        </div>
        {booking.status === "PENDING_PROVIDER_RESPONSE" && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => respond(booking.id, "accept")}
              disabled={respondingId === booking.id}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => respond(booking.id, "decline")}
              disabled={respondingId === booking.id}
            >
              Decline
            </Button>
          </div>
        )}
      </div>
    );
  }
}
