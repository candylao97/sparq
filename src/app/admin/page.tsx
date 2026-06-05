"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  DollarSign,
  Users,
  UserCheck,
  Clock,
  Star,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { DashboardMetrics, LeakageIndicators } from "@/types";

type MetricsResponse = {
  metrics: DashboardMetrics;
  leakage: LeakageIndicators;
};

function formatAUD(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

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

function LeakageBadge({ value, suffix }: { value: number; suffix: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-950 px-2 py-0.5 text-xs font-semibold text-red-400">
      <AlertTriangle className="size-3" />
      {value.toFixed(1)}{suffix}
    </span>
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
  const leakage = data?.leakage;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform health at a glance</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
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
            value={formatAUD(metrics?.totalRevenue ?? 0)}
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

      {/* Quick links */}
      {(metrics?.pendingApprovals ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3">
          <AlertTriangle className="size-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-semibold">{metrics?.pendingApprovals}</span> provider
            {metrics?.pendingApprovals === 1 ? "" : "s"} waiting for approval.{" "}
            <Link href="/admin/providers" className="underline underline-offset-2 hover:text-white transition-colors">
              Review now
            </Link>
          </p>
        </div>
      )}

      {/* Leakage Monitoring */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4 text-red-400" />
          <h2 className="text-base font-semibold text-white">Leakage Monitoring</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* High Expiry Rate */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">High Expiry Rate</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-8 rounded-lg bg-gray-800 animate-pulse" />)}
              </div>
            ) : !leakage?.highExpiryRateProviders.length ? (
              <p className="text-sm text-gray-500">No providers flagged.</p>
            ) : (
              <ul className="space-y-2">
                {leakage.highExpiryRateProviders.map((p) => (
                  <li key={p.providerId} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/providers?tab=all&highlight=${p.providerId}`}
                      className="text-sm text-gray-300 hover:text-white truncate transition-colors"
                    >
                      {p.name}
                    </Link>
                    <LeakageBadge value={p.expiryRate} suffix="%" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Unusual Cancellations */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Unusual Cancellations</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-8 rounded-lg bg-gray-800 animate-pulse" />)}
              </div>
            ) : !leakage?.unusualCancellationPatterns.length ? (
              <p className="text-sm text-gray-500">No providers flagged.</p>
            ) : (
              <ul className="space-y-2">
                {leakage.unusualCancellationPatterns.map((p) => (
                  <li key={p.providerId} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/providers?tab=all&highlight=${p.providerId}`}
                      className="text-sm text-gray-300 hover:text-white truncate transition-colors"
                    >
                      {p.name}
                    </Link>
                    <LeakageBadge value={p.cancellationRate} suffix="%" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Poor Response Rate */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Poor Response Rate</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-8 rounded-lg bg-gray-800 animate-pulse" />)}
              </div>
            ) : !leakage?.poorResponseRate.length ? (
              <p className="text-sm text-gray-500">No providers flagged.</p>
            ) : (
              <ul className="space-y-2">
                {leakage.poorResponseRate.map((p) => (
                  <li key={p.providerId} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/providers?tab=all&highlight=${p.providerId}`}
                      className="text-sm text-gray-300 hover:text-white truncate transition-colors"
                    >
                      {p.name}
                    </Link>
                    <LeakageBadge value={p.responseRate} suffix="%" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
