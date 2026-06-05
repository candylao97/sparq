"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { DollarSign, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingWithDetails } from "@/types";

interface PayoutDetails {
  accountName?: string | null;
  bsb?: string | null;
  accountNumber?: string | null;
}

function maskAccount(accountNumber?: string | null) {
  if (!accountNumber) return null;
  return `••••${accountNumber.slice(-4)}`;
}

export default function ProviderEarningsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [payout, setPayout] = useState<PayoutDetails | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load earnings"))
      .finally(() => setLoadingBookings(false));

    fetch("/api/providers/payout")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PayoutDetails | null) => setPayout(data))
      .catch(() => {});
  }, []);

  const payoutSet = payout?.accountNumber && payout?.bsb;

  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");

  const totalEarnings = completedBookings.reduce(
    (sum, b) => sum + (b.payment?.amount ?? b.totalPrice ?? 0),
    0
  );

  const now = new Date();
  const thisMonthEarnings = completedBookings
    .filter((b) => {
      const d = new Date(b.bookingDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, b) => sum + (b.payment?.amount ?? b.totalPrice ?? 0), 0);

  const sortedEarnings = [...completedBookings].sort(
    (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your revenue from completed bookings</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total earnings</p>
                <p className="text-3xl font-bold mt-1">
                  {loadingBookings ? "—" : `$${totalEarnings.toFixed(2)}`}
                </p>
              </div>
              <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                <DollarSign className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This month</p>
                <p className="text-3xl font-bold mt-1">
                  {loadingBookings ? "—" : `$${thisMonthEarnings.toFixed(2)}`}
                </p>
              </div>
              <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                <DollarSign className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout account note */}
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium">Payout account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {payoutSet
                ? `${payout?.accountName ? `${payout.accountName} · ` : ""}BSB ${payout?.bsb} · A/C ${maskAccount(payout?.accountNumber)}`
                : "No payout account set yet — add your bank details to get paid."}
            </p>
          </div>
          <Link
            href="/provider/settings"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-neutral-900 hover:underline"
          >
            Manage payout details
            <ArrowRight className="size-4" />
          </Link>
        </CardContent>
      </Card>

      {/* Earnings list */}
      <Card>
        <CardHeader>
          <CardTitle>Completed bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBookings ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sortedEarnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed bookings yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {sortedEarnings.map((booking) => (
                <div key={booking.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {booking.customer?.name ?? "Unknown customer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.service?.title} &middot;{" "}
                      {format(new Date(booking.bookingDate), "d MMM yyyy")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-700">
                    +${(booking.payment?.amount ?? booking.totalPrice ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
