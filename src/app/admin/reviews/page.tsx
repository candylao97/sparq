"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Eye, EyeOff, Star, Filter } from "lucide-react";
import { toast } from "sonner";

// ---- Types ----------------------------------------------------------------

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  customer: { id: string; name: string | null };
  provider: { user: { name: string | null } };
  booking: { service: { title: string } };
};

// ---- Helpers ---------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-400">{rating}/5</span>
    </span>
  );
}

function statusBadge(status: string) {
  if (status === "PUBLISHED") {
    return (
      <span className="inline-flex items-center rounded-full border border-green-900 bg-green-950 px-2 py-0.5 text-xs font-semibold text-green-400">
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-400">
      Hidden
    </span>
  );
}

// ---- Page ------------------------------------------------------------------

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    setLoading(true);
    const url = statusFilter
      ? `/api/admin/reviews?status=${statusFilter}`
      : "/api/admin/reviews";
    fetch(url)
      .then((r) => r.json())
      .then(setReviews)
      .catch(() => toast.error("Failed to load reviews"))
      .finally(() => setLoading(false));
  }, [statusFilter, version]);

  async function moderate(reviewId: string, action: "hide" | "restore") {
    setActing(reviewId);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Action failed");
      }
      toast.success(`Review ${action === "hide" ? "hidden" : "restored"}`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews</h1>
          <p className="text-sm text-gray-400 mt-0.5">Moderate customer reviews across the platform</p>
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
              <option value="">All Reviews</option>
              <option value="PUBLISHED">Published</option>
              <option value="HIDDEN">Hidden</option>
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
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          {statusFilter ? ` — ${statusFilter.toLowerCase()}` : ""}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide min-w-[200px]">Comment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-medium">
                      {r.customer.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {r.provider.user.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">
                      {r.booking.service.title}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={r.rating} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs">
                      {r.comment ? (
                        <p className="line-clamp-2 text-sm">{r.comment}</p>
                      ) : (
                        <span className="text-gray-600 italic text-xs">No comment</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(r.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "PUBLISHED" ? (
                        <button
                          onClick={() => moderate(r.id, "hide")}
                          disabled={acting === r.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          <EyeOff className="size-3" />
                          {acting === r.id ? "Hiding..." : "Hide"}
                        </button>
                      ) : (
                        <button
                          onClick={() => moderate(r.id, "restore")}
                          disabled={acting === r.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-950 border border-green-900 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-900 transition-colors disabled:opacity-50"
                        >
                          <Eye className="size-3" />
                          {acting === r.id ? "Restoring..." : "Restore"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!reviews.length && (
              <div className="py-16 text-center text-sm text-gray-500">
                No reviews found{statusFilter ? ` with status "${statusFilter.toLowerCase()}"` : ""}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
