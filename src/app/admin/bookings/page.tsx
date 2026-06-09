"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, RotateCcw, Filter } from "lucide-react";
import { toast } from "sonner";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

// ---- Types ----------------------------------------------------------------

type BookingRow = {
  id: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
  customer: { id: string; name: string | null; email: string };
  provider: {
    user: { name: string | null; email: string };
  };
  service: { title: string };
  payment: {
    id: string;
    status: string;
    amount: number;
  } | null;
};

// ---- Helpers ---------------------------------------------------------------


function bookingStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING_PROVIDER_RESPONSE: "bg-yellow-950 text-yellow-400 border-yellow-900",
    DECLINED: "bg-gray-800 text-gray-400 border-gray-700",
    CONFIRMED: "bg-blue-950 text-blue-400 border-blue-900",
    COMPLETED: "bg-green-950 text-green-400 border-green-900",
    CANCELLED_BY_CUSTOMER: "bg-orange-950 text-orange-400 border-orange-900",
    CANCELLED_BY_PROVIDER: "bg-orange-950 text-orange-400 border-orange-900",
    REFUNDED: "bg-purple-950 text-purple-400 border-purple-900",
    EXPIRED: "bg-gray-800 text-gray-400 border-gray-700",
    DISPUTED: "bg-red-950 text-red-400 border-red-900",
  };
  const cls = map[status] ?? "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>
      {BOOKING_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function paymentStatusBadge(status: string) {
  const map: Record<string, string> = {
    AUTH_PENDING: "bg-yellow-950 text-yellow-400 border-yellow-900",
    AUTHORISED: "bg-blue-950 text-blue-400 border-blue-900",
    CAPTURED: "bg-green-950 text-green-400 border-green-900",
    AUTH_RELEASED: "bg-gray-800 text-gray-400 border-gray-700",
    REFUNDED: "bg-purple-950 text-purple-400 border-purple-900",
    FAILED: "bg-red-950 text-red-400 border-red-900",
  };
  const cls = map[status] ?? "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ---- Page ------------------------------------------------------------------

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [refunding, setRefunding] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    setLoading(true);
    const url = statusFilter
      ? `/api/admin/bookings?status=${statusFilter}`
      : "/api/admin/bookings";
    fetch(url)
      .then((r) => r.json())
      .then(setBookings)
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [statusFilter, version]);

  async function refund(paymentId: string) {
    setRefunding(paymentId);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action: "refund" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Refund failed");
      }
      toast.success("Refund initiated");
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefunding(null);
    }
  }

  const statuses = Object.keys(BOOKING_STATUS_LABELS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-sm text-gray-400 mt-0.5">All platform bookings with refund controls</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2">
            <Filter className="size-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          {statusFilter ? ` with status "${BOOKING_STATUS_LABELS[statusFilter]}"` : ""}
        </p>
      )}

      {/* Table */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Booking Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{b.customer.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{b.customer.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-300">{b.provider.user.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{b.provider.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[140px] truncate">
                      {b.service.title}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(b.scheduledAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">{bookingStatusBadge(b.status)}</td>
                    <td className="px-4 py-3">
                      {b.payment ? paymentStatusBadge(b.payment.status) : (
                        <span className="text-xs text-gray-600">No payment</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap font-medium">
                      {b.payment
                        ? formatCurrency(b.payment.amount, {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.payment?.status === "CAPTURED" && (
                        <button
                          onClick={() => refund(b.payment!.id)}
                          disabled={refunding === b.payment!.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-950 border border-red-900 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="size-3" />
                          {refunding === b.payment!.id ? "Refunding..." : "Refund"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bookings.length && (
              <div className="py-16 text-center text-sm text-gray-500">
                No bookings found{statusFilter ? ` for status "${BOOKING_STATUS_LABELS[statusFilter]}"` : ""}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
