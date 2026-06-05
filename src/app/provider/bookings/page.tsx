"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
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

function BookingCard({
  booking,
  onRespond,
  onComplete,
  respondingId,
  completingId,
}: {
  booking: BookingWithDetails;
  onRespond: (id: string, action: "accept" | "decline") => void;
  onComplete: (id: string) => void;
  respondingId: string | null;
  completingId: string | null;
}) {
  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border last:border-0">
      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {booking.customer?.name ?? "Unknown customer"}
          </span>
          <Badge variant={getStatusVariant(booking.status)}>
            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {booking.service?.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(booking.bookingDate), "EEEE d MMM yyyy")} at {booking.startTime}
        </p>
        <p className="text-sm font-medium">
          ${(booking.totalPrice ?? 0).toFixed(2)}
        </p>
        {booking.customer?.email && (
          <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        {booking.status === "PENDING_PROVIDER_RESPONSE" && (
          <>
            <Button
              size="sm"
              onClick={() => onRespond(booking.id, "accept")}
              disabled={respondingId === booking.id}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onRespond(booking.id, "decline")}
              disabled={respondingId === booking.id}
            >
              Decline
            </Button>
          </>
        )}
        {booking.status === "CONFIRMED" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onComplete(booking.id)}
            disabled={completingId === booking.id}
          >
            {completingId === booking.id ? "Marking..." : "Mark complete"}
          </Button>
        )}
      </div>
    </div>
  );
}

function BookingList({
  bookings,
  loading,
  onRespond,
  onComplete,
  respondingId,
  completingId,
}: {
  bookings: BookingWithDetails[];
  loading: boolean;
  onRespond: (id: string, action: "accept" | "decline") => void;
  onComplete: (id: string) => void;
  respondingId: string | null;
  completingId: string | null;
}) {
  if (loading) return <p className="text-sm text-muted-foreground p-2">Loading...</p>;
  if (bookings.length === 0) return <p className="text-sm text-muted-foreground p-2">No bookings found.</p>;
  return (
    <div>
      {bookings.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          onRespond={onRespond}
          onComplete={onComplete}
          respondingId={respondingId}
          completingId={completingId}
        />
      ))}
    </div>
  );
}

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleRespond(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      const newStatus = action === "accept" ? "CONFIRMED" : "DECLINED";
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
      toast.success(action === "accept" ? "Booking accepted" : "Booking declined");
    } catch {
      toast.error("Failed to respond to booking");
    } finally {
      setRespondingId(null);
    }
  }

  async function handleComplete(id: string) {
    setCompletingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error();
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "COMPLETED" } : b))
      );
      toast.success("Booking marked as complete");
    } catch {
      toast.error("Failed to mark booking complete");
    } finally {
      setCompletingId(null);
    }
  }

  const pending = bookings.filter((b) => b.status === "PENDING_PROVIDER_RESPONSE");
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const completed = bookings.filter((b) => b.status === "COMPLETED");

  const tabData = [
    { value: "pending", label: `Pending (${pending.length})`, bookings: pending },
    { value: "confirmed", label: `Confirmed (${confirmed.length})`, bookings: confirmed },
    { value: "completed", label: `Completed (${completed.length})`, bookings: completed },
    { value: "all", label: `All (${bookings.length})`, bookings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage all your bookings</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="flex-wrap h-auto">
          {tabData.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="text-xs sm:text-sm">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabData.map(({ value, bookings: tabBookings }) => (
          <TabsContent key={value} value={value}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{value === "all" ? "All bookings" : `${value} bookings`}</CardTitle>
              </CardHeader>
              <CardContent>
                <BookingList
                  bookings={tabBookings}
                  loading={loading}
                  onRespond={handleRespond}
                  onComplete={handleComplete}
                  respondingId={respondingId}
                  completingId={completingId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
