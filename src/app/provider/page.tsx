"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, Clock, Inbox, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import {
  deriveProviderStats,
  orderProviderBookings,
} from "@/lib/provider-dashboard";
import { deriveFirstName } from "@/lib/customer-dashboard";
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
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondingAction, setRespondingAction] = useState<
    "accept" | "decline" | null
  >(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const orderedBookings = orderProviderBookings(bookings);
  const { pendingCount, confirmedCount, completedCount } =
    deriveProviderStats(bookings);
  const firstName = deriveFirstName(session?.user?.name);

  async function respond(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    setRespondingAction(action);
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
      setRespondingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
        {firstName ? `Hi ${firstName}` : "Overview"}
      </h1>

      {/* At a glance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-neutral-500">
            <Clock className="size-4 text-neutral-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-neutral-500">
            <CalendarClock className="size-4 text-neutral-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Confirmed
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {confirmedCount}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-neutral-200 bg-white p-4 sm:col-span-1">
          <div className="flex items-center gap-2 text-neutral-500">
            <CheckCircle2 className="size-4 text-neutral-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Completed
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {completedCount}
          </p>
        </div>
      </div>

      {/* Booking requests */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Booking requests
        </h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {loading ? (
            renderSkeleton()
          ) : orderedBookings.length === 0 ? (
            renderEmptyState()
          ) : (
            <ul>
              {orderedBookings.map((booking, i) =>
                renderBookingRow(booking, i)
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="pt-2 text-sm text-neutral-500">
        Questions?{" "}
        <Link
          href="/contact"
          className="font-medium text-neutral-900 hover:underline"
        >
          Reach out to us.
        </Link>
      </p>
    </div>
  );

  function renderSkeleton() {
    return (
      <div aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-start justify-between gap-4 px-5 py-4 ${
              i > 0 ? "border-t border-neutral-100" : ""
            }`}
          >
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
              <div className="h-3.5 w-56 animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
            </div>
            <div className="h-8 w-32 animate-pulse rounded-md bg-neutral-100" />
          </div>
        ))}
      </div>
    );
  }

  function renderEmptyState() {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
          <Inbox className="size-6 text-neutral-400" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-neutral-700">No bookings yet</p>
          <p className="text-sm text-neutral-400">
            New booking requests from customers will appear here.
          </p>
        </div>
      </div>
    );
  }

  function renderBookingRow(booking: BookingWithDetails, index: number) {
    const isPending = booking.status === "PENDING_PROVIDER_RESPONSE";
    const isResponding = respondingId === booking.id;
    const customerName = booking.customer?.name ?? "Unknown customer";
    const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;

    return (
      <li
        key={booking.id}
        className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
          index > 0 ? "border-t border-neutral-100" : ""
        } ${isPending ? "bg-yellow-50/60" : ""}`}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-neutral-900">
              {customerName}
            </span>
            <Badge variant={getStatusVariant(booking.status)}>
              <span className="sr-only">Status: </span>
              {statusLabel}
            </Badge>
          </div>
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-neutral-600">
            <CalendarClock
              className="size-3.5 shrink-0 text-neutral-400"
              aria-hidden="true"
            />
            <span className="truncate">
              {booking.service?.title} &middot;{" "}
              {format(new Date(booking.bookingDate), "d MMM yyyy")} at{" "}
              {booking.startTime}
            </span>
          </p>
          <p className="text-sm font-semibold tabular-nums text-neutral-900">
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
              {isResponding && respondingAction === "accept" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Accepting…
                </>
              ) : (
                "Accept"
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => respond(booking.id, "decline")}
              disabled={isResponding}
              aria-label={`Decline booking from ${customerName}`}
              className="flex-1 sm:flex-none"
            >
              {isResponding && respondingAction === "decline" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Declining…
                </>
              ) : (
                "Decline"
              )}
            </Button>
          </div>
        )}
      </li>
    );
  }
}
