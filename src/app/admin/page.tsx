"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  DollarSign,
  Users,
  UserCheck,
  Clock,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/types";

type MetricsResponse = {
  metrics: DashboardMetrics;
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
          <p className={`mt-1.5 text-2xl font-bold ${accent ? "text-red-400" : "text-white"}`}>
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`flex size-9 items-center justify-center rounded-lg ${accent ? "bg-red-950 text-red-400" : "bg-gray-800 text-gray-400"}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error("Failed to load metrics");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const metrics = data?.metrics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform health at a glance</p>
      </div>

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Bookings"
            value={metrics?.totalBookings ?? 0}
            icon={CalendarDays}
            sub={`${metrics?.activeBookings ?? 0} active, ${metrics?.completedBookings ?? 0} completed`}
          />
          <StatCard
            label="Revenue"
            value={formatCurrency(metrics?.totalRevenue ?? 0, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
            icon={DollarSign}
            sub="From captured payments"
          />
          <StatCard
            label="Active Providers"
            value={metrics?.totalProviders ?? 0}
            icon={UserCheck}
            sub="Approved & live"
          />
          <StatCard
            label="Customers"
            value={metrics?.totalCustomers ?? 0}
            icon={Users}
            sub="Registered accounts"
          />
          <StatCard
            label="Pending Approvals"
            value={metrics?.pendingApprovals ?? 0}
            icon={Clock}
            accent={(metrics?.pendingApprovals ?? 0) > 0}
            sub={
              (metrics?.pendingApprovals ?? 0) > 0
                ? "Requires review"
                : "All clear"
            }
          />
          <StatCard
            label="Avg Rating"
            value={metrics?.averageRating ? metrics.averageRating.toFixed(2) : "—"}
            icon={Star}
            sub="From published reviews"
          />
        </div>
      )}
    </div>
  );
}
