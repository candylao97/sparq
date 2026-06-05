"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, RefreshCw, ChevronRight } from "lucide-react";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";

type Booking = {
  id: string;
  bookingDate: string;
  startTime: string;
  status: string;
  totalAmount: number;
  service: { id: string; title: string };
  provider: {
    id: string;
    name: string | null;
    providerProfile: { id: string; businessName: string | null };
  };
};

const UPCOMING_STATUSES = ["PENDING_PROVIDER_RESPONSE", "CONFIRMED"];
const PAST_STATUSES = [
  "COMPLETED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_PROVIDER",
  "DECLINED",
  "EXPIRED",
  "REFUNDED",
];

type Tab = "upcoming" | "past";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter((b) => UPCOMING_STATUSES.includes(b.status));
  const past = bookings.filter((b) => PAST_STATUSES.includes(b.status));
  const displayed = activeTab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track and manage all your appointments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "upcoming"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Upcoming
          {upcoming.length > 0 && (
            <span className="ml-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {upcoming.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "past"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Past
        </button>
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-gray-400 text-sm">Loading bookings...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">
            {activeTab === "upcoming" ? "No upcoming bookings" : "No past bookings"}
          </p>
          {activeTab === "upcoming" && (
            <div className="mt-4">
              <Link href="/providers">
                <Button size="sm">Find a provider</Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((booking) => (
            <BookingCard key={booking.id} booking={booking} showRebook={booking.status === "COMPLETED"} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  showRebook,
}: {
  booking: Booking;
  showRebook: boolean;
}) {
  const providerName =
    booking.provider.providerProfile?.businessName ||
    booking.provider.name ||
    "Provider";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">
              {booking.service.title}
            </p>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{providerName}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(parseISO(booking.bookingDate), "EEE, d MMM yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {booking.startTime}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-gray-900">${booking.totalAmount}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <Link href={`/customer/bookings/${booking.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View details <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
        {showRebook && (
          <Link
            href={`/providers/${booking.provider.providerProfile?.id}/book?serviceId=${booking.service.id}`}
          >
            <Button size="sm" variant="secondary">
              <RefreshCw className="w-3.5 h-3.5" />
              Rebook
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = BOOKING_STATUS_LABELS[status] ?? status;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(status)}`}>
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
