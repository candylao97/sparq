"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Clock,
  CheckCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { deriveProviderDashboard } from "@/lib/provider-dashboard";
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

  const {
    pendingCount,
    confirmedCount,
    completedThisMonthCount,
    totalEarnings,
    pendingRequests,
    recentRequests,
  } = deriveProviderDashboard(bookings, new Date());

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

  const stats = [
    {
      label: "Pending requests",
      value: pendingCount,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Confirmed bookings",
      value: confirmedCount,
      icon: CheckCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Completed this month",
      value: completedThisMonthCount,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total earnings",
      value: `$${totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back to your provider dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{loading ? "—" : value}</p>
                </div>
                <div className={`${bg} ${color} p-2 rounded-lg`}>
                  <Icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action needed */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Action needed</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up — no requests waiting.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {pendingRequests.map((booking) => renderBookingRow(booking))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent booking requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent booking requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentRequests.map((booking) => renderBookingRow(booking))}
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
