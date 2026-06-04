"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight, Clock, Sparkles } from "lucide-react";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";

type Booking = {
  id: string;
  bookingDate: string;
  startTime: string;
  status: string;
  totalAmount: number;
  service: { title: string };
  provider: { name: string | null; providerProfile: { businessName: string | null } };
};

const UPCOMING_STATUSES = ["PENDING_PROVIDER_RESPONSE", "CONFIRMED"];

export default function CustomerOverviewPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const upcomingBookings = bookings.filter((b) =>
    UPCOMING_STATUSES.includes(b.status)
  );

  const name = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-neutral-950 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <p className="text-neutral-300 text-sm font-medium">Welcome back</p>
        </div>
        <h1 className="text-2xl font-bold">Hey, {name}!</h1>
        <p className="text-neutral-300 mt-1 text-sm">
          Manage your bookings and discover new providers.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {loading ? "—" : upcomingBookings.length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">bookings</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {loading ? "—" : bookings.length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">bookings all time</p>
        </div>
      </div>

      {/* Upcoming bookings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            Upcoming bookings
          </h2>
          <Link
            href="/customer/bookings"
            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : upcomingBookings.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No upcoming bookings</p>
            <p className="text-gray-400 text-xs mt-1">Book a service to get started</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcomingBookings.slice(0, 3).map((booking) => {
              const providerName =
                booking.provider.providerProfile?.businessName ||
                booking.provider.name ||
                "Provider";
              return (
                <li key={booking.id}>
                  <Link
                    href={`/customer/bookings/${booking.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.service.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{providerName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(booking.bookingDate), "EEE d MMM")}{" "}
                        at {booking.startTime}
                      </p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <StatusBadge status={booking.status} />
                      <p className="text-xs text-gray-500 mt-1">
                        ${booking.totalAmount}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick action */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900 text-sm">Discover providers</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Browse trusted nail and lash artists near you
          </p>
        </div>
        <Link href="/providers">
          <Button size="sm">
            Browse <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = BOOKING_STATUS_LABELS[status] ?? status;
  const colorClass = getStatusColor(status);
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      {label}
    </span>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "PENDING_PROVIDER_RESPONSE":
      return "bg-yellow-100 text-yellow-800";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "DECLINED":
      return "bg-red-100 text-red-800";
    case "CANCELLED_BY_CUSTOMER":
    case "CANCELLED_BY_PROVIDER":
    case "EXPIRED":
      return "bg-gray-100 text-gray-700";
    case "REFUNDED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
