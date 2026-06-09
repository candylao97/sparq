"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  PauseCircle,
  ChevronDown,
  Plus,
  StickyNote,
  RefreshCw,
  MapPin,
  Scissors,
  Mail,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

// ---- Types ----------------------------------------------------------------

type ProviderQueueItem = {
  id: string;
  bio: string | null;
  businessName: string | null;
  moderationStatus: string;
  submittedAt: string | null;
  user: { name: string | null; email: string; createdAt: string };
  suburbs: { suburb: string }[];
  services: { id: string; title: string; category: string; priceInCents: number }[];
  portfolioImages: { url: string }[];
};

type ProviderRow = {
  id: string;
  businessName: string | null;
  moderationStatus: string;
  avgRating: number | null;
  responseRate: number | null;
  user: { name: string | null; email: string; createdAt: string };
  suburbs: { suburb: string }[];
  _count: { bookings: number; reviews: number };
};

type AdminNote = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string | null };
};

// ---- Helpers ---------------------------------------------------------------

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUBMITTED: "bg-yellow-950 text-yellow-400 border-yellow-900",
    UNDER_REVIEW: "bg-blue-950 text-blue-400 border-blue-900",
    APPROVED: "bg-green-950 text-green-400 border-green-900",
    REJECTED: "bg-red-950 text-red-400 border-red-900",
    SUSPENDED: "bg-orange-950 text-orange-400 border-orange-900",
  };
  const cls = map[status] ?? "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}


// ---- Reject / Suspend Dialog -----------------------------------------------

function ReasonDialog({
  title,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-1">{title}</h2>
        <p className="text-sm text-gray-400 mb-4">Please provide a reason. This will be saved as an admin note.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason..."
          rows={4}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Admin Notes Panel -----------------------------------------------------

function NotesPanel({ providerId }: { providerId: string }) {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/notes?providerId=${providerId}`)
      .then((r) => r.json())
      .then(setNotes)
      .catch(() => toast.error("Failed to load notes"))
      .finally(() => setLoading(false));
  }, [providerId]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, content: newNote.trim() }),
      });
      if (!res.ok) throw new Error();
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewNote("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-gray-800 border border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote className="size-3.5 text-gray-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Notes</span>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 rounded-lg bg-gray-700 border border-gray-600 px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addNote()}
        />
        <button
          onClick={addNote}
          disabled={!newNote.trim() || saving}
          className="flex items-center gap-1 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-gray-500">Loading notes...</p>
      ) : !notes.length ? (
        <p className="text-xs text-gray-500">No notes yet.</p>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-gray-700 px-3 py-2">
              <p className="text-sm text-gray-200">{n.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {n.author.name ?? "Admin"} &middot;{" "}
                {new Date(n.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Approval Queue Card ---------------------------------------------------

function QueueCard({
  provider,
  onAction,
}: {
  provider: ProviderQueueItem;
  onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null);
  const [acting, setActing] = useState(false);

  async function doAction(action: string, reason?: string) {
    setActing(true);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: provider.id, action, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Action failed");
      }
      toast.success(`Provider ${action}d successfully`);
      onAction();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
      setDialog(null);
    }
  }

  return (
    <>
      {dialog && (
        <ReasonDialog
          title={dialog === "reject" ? "Reject Provider" : "Suspend Provider"}
          onConfirm={(reason) => doAction(dialog, reason)}
          onCancel={() => setDialog(null)}
          loading={acting}
        />
      )}

      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white truncate">
                  {provider.businessName ?? provider.user.name ?? "Unnamed"}
                </h3>
                {statusBadge(provider.moderationStatus)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Mail className="size-3" /> {provider.user.email}
                </span>
                {provider.submittedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Submitted {new Date(provider.submittedAt).toLocaleDateString("en-AU")}
                  </span>
                )}
              </div>

              {/* Services */}
              {provider.services.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {provider.services.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                      <Scissors className="size-3" />
                      {s.title} —{" "}
                      {formatCurrency(s.priceInCents, {
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  ))}
                </div>
              )}

              {/* Suburbs */}
              {provider.suburbs.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {provider.suburbs.map((s) => (
                    <span key={s.suburb} className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      <MapPin className="size-3" /> {s.suburb}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => doAction("approve")}
                disabled={acting}
                className="flex items-center gap-1.5 rounded-lg bg-green-800 px-3 py-1.5 text-xs font-semibold text-green-100 hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="size-3.5" /> Approve
              </button>
              <button
                onClick={() => setDialog("reject")}
                disabled={acting}
                className="flex items-center gap-1.5 rounded-lg bg-red-900 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-800 transition-colors disabled:opacity-50"
              >
                <XCircle className="size-3.5" /> Reject
              </button>
            </div>
          </div>

          {/* Bio */}
          {provider.bio && (
            <p className="mt-3 text-xs text-gray-400 leading-relaxed line-clamp-2">{provider.bio}</p>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Hide" : "Show"} admin notes
          </button>

          {expanded && <NotesPanel providerId={provider.id} />}
        </div>
      </div>
    </>
  );
}

// ---- All Providers Table ---------------------------------------------------

function AllProvidersTable({
  providers,
  onAction,
}: {
  providers: ProviderRow[];
  onAction: () => void;
}) {
  const [dialog, setDialog] = useState<{ id: string; action: "reject" | "suspend" } | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function doAction(profileId: string, action: string, reason?: string) {
    setActing(profileId);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Action failed");
      }
      toast.success(`Action "${action}" applied`);
      onAction();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
      setDialog(null);
    }
  }

  return (
    <>
      {dialog && (
        <ReasonDialog
          title={dialog.action === "reject" ? "Reject Provider" : "Suspend Provider"}
          onConfirm={(reason) => doAction(dialog.id, dialog.action, reason)}
          onCancel={() => setDialog(null)}
          loading={!!acting}
        />
      )}

      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Suburbs</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Bookings</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Rating</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {providers.map((p) => (
                <>
                  <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">
                      {p.businessName ?? p.user.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{p.user.email}</td>
                    <td className="px-4 py-3">{statusBadge(p.moderationStatus)}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                      {p.suburbs.map((s) => s.suburb).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{p._count.bookings}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {p.avgRating != null ? p.avgRating.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {p.moderationStatus !== "APPROVED" && (
                          <button
                            onClick={() => doAction(p.id, "approve")}
                            disabled={acting === p.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-green-900 text-green-300 hover:bg-green-800 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {p.moderationStatus !== "SUSPENDED" && (
                          <button
                            onClick={() => setDialog({ id: p.id, action: "suspend" })}
                            disabled={acting === p.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-orange-950 text-orange-300 hover:bg-orange-900 transition-colors disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        )}
                        {p.moderationStatus !== "REJECTED" && (
                          <button
                            onClick={() => setDialog({ id: p.id, action: "reject" })}
                            disabled={acting === p.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-950 text-red-300 hover:bg-red-900 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                          className="rounded px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          Notes
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr key={`${p.id}-notes`}>
                      <td colSpan={7} className="px-4 pb-4 bg-gray-800/30">
                        <NotesPanel providerId={p.id} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {!providers.length && (
          <div className="py-12 text-center text-sm text-gray-500">No providers found.</div>
        )}
      </div>
    </>
  );
}

// ---- Page ------------------------------------------------------------------

export default function AdminProvidersPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "all" ? "all" : "queue";

  const [tab, setTab] = useState<"queue" | "all">(initialTab as "queue" | "all");
  const [queue, setQueue] = useState<ProviderQueueItem[]>([]);
  const [all, setAll] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    setLoading(true);
    const queueFetch = fetch("/api/admin/providers?queue=true").then((r) => r.json());
    const allFetch = fetch("/api/admin/providers").then((r) => r.json());

    Promise.all([queueFetch, allFetch])
      .then(([q, a]) => {
        setQueue(q);
        setAll(a);
      })
      .catch(() => toast.error("Failed to load providers"))
      .finally(() => setLoading(false));
  }, [version]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Providers</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage provider approvals and accounts</p>
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-900 border border-gray-800 p-1 w-fit">
        {(["queue", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-red-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "queue" ? `Approval Queue (${queue.length})` : `All Providers (${all.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : tab === "queue" ? (
        queue.length === 0 ? (
          <div className="rounded-xl bg-gray-900 border border-gray-800 py-16 text-center">
            <CheckCircle className="mx-auto size-8 text-green-600 mb-3" />
            <p className="text-gray-300 font-medium">All caught up!</p>
            <p className="text-sm text-gray-500 mt-1">No providers waiting for approval.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((p) => (
              <QueueCard key={p.id} provider={p} onAction={reload} />
            ))}
          </div>
        )
      ) : (
        <AllProvidersTable providers={all} onAction={reload} />
      )}
    </div>
  );
}
