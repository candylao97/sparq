"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { DollarSign, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingWithDetails } from "@/types";

interface StripeStatus {
  connected: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
}

export default function ProviderEarningsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load earnings"))
      .finally(() => setLoadingBookings(false));

    fetch("/api/stripe/connect")
      .then((r) => r.json())
      .then((data: StripeStatus) => setStripeStatus(data))
      .catch(() => {})
      .finally(() => setLoadingStripe(false));
  }, []);

  async function handleConnectStripe() {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Failed to start Stripe Connect");
      setConnectingStripe(false);
    }
  }

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

  const stripeFullyOnboarded =
    stripeStatus?.connected &&
    stripeStatus?.detailsSubmitted &&
    stripeStatus?.payoutsEnabled;

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

      {/* Stripe Connect */}
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStripe ? (
            <p className="text-sm text-muted-foreground">Checking Stripe status...</p>
          ) : stripeFullyOnboarded ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700">Stripe connected</p>
                <p className="text-xs text-muted-foreground">Payouts are enabled for your account</p>
              </div>
              <Badge variant="green" className="ml-auto">Active</Badge>
            </div>
          ) : stripeStatus?.connected && !stripeFullyOnboarded ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5 text-yellow-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-700">Stripe onboarding incomplete</p>
                  <p className="text-xs text-muted-foreground">
                    Please complete your Stripe account setup to receive payouts
                  </p>
                </div>
              </div>
              <Button onClick={handleConnectStripe} disabled={connectingStripe} variant="outline">
                <ExternalLink className="size-4 mr-1.5" />
                {connectingStripe ? "Redirecting..." : "Continue Stripe setup"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to receive payouts for completed bookings.
              </p>
              <Button onClick={handleConnectStripe} disabled={connectingStripe}>
                <ExternalLink className="size-4 mr-1.5" />
                {connectingStripe ? "Redirecting..." : "Connect Stripe"}
              </Button>
            </div>
          )}
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
