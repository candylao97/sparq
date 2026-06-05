"use client";

import { useState } from "react";
import { Settings, MapPin, Plus, X, Save, Globe } from "lucide-react";
import { toast } from "sonner";
import { LAUNCH_SUBURBS } from "@/lib/constants";

export default function AdminSettingsPage() {
  const [suburbs, setSuburbs] = useState<string[]>([...LAUNCH_SUBURBS]);
  const [newSuburb, setNewSuburb] = useState("");
  const [saving, setSaving] = useState(false);

  function addSuburb() {
    const trimmed = newSuburb.trim();
    if (!trimmed) return;
    if (suburbs.includes(trimmed)) {
      toast.error("Suburb already in list");
      return;
    }
    setSuburbs((prev) => [...prev, trimmed]);
    setNewSuburb("");
  }

  function removeSuburb(suburb: string) {
    setSuburbs((prev) => prev.filter((s) => s !== suburb));
  }

  async function save() {
    setSaving(true);
    // Placeholder — wire to a real settings API when available
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Settings saved (placeholder)");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform configuration and suburb management</p>
      </div>

      {/* Platform Settings */}
      <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Globe className="size-4 text-gray-400" />
          <h2 className="text-base font-semibold text-white">Platform Settings</h2>
        </div>
        <p className="text-sm text-gray-500">
          Global platform configuration will appear here. Connect a settings API to persist changes.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Platform Name
            </label>
            <input
              type="text"
              defaultValue="Sparq"
              disabled
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Provider Response Window (hours)
            </label>
            <input
              type="number"
              defaultValue={24}
              disabled
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Launch Region
            </label>
            <input
              type="text"
              defaultValue="Melbourne, VIC"
              disabled
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-600 italic">
            These settings are currently read-only. A settings API will be connected in a future release.
          </p>
        </div>
      </section>

      {/* Suburb Management */}
      <section className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-5">
        <div className="flex items-center gap-2.5 mb-1">
          <MapPin className="size-4 text-gray-400" />
          <h2 className="text-base font-semibold text-white">Launch Suburbs</h2>
        </div>
        <p className="text-sm text-gray-500">
          Manage the list of suburbs displayed to providers and customers during onboarding.
        </p>

        {/* Add suburb */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newSuburb}
            onChange={(e) => setNewSuburb(e.target.value)}
            placeholder="New suburb name..."
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
            onKeyDown={(e) => e.key === "Enter" && addSuburb()}
          />
          <button
            onClick={addSuburb}
            disabled={!newSuburb.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>

        {/* Suburb list */}
        <ul className="space-y-2">
          {suburbs.map((suburb) => (
            <li
              key={suburb}
              className="flex items-center justify-between rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5"
            >
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MapPin className="size-3.5 text-gray-500" />
                {suburb}
              </div>
              <button
                onClick={() => removeSuburb(suburb)}
                className="flex items-center justify-center size-6 rounded-md text-gray-500 hover:bg-gray-700 hover:text-red-400 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {suburbs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No suburbs configured.</p>
        )}

        {/* Save */}
        <div className="flex justify-end pt-2 border-t border-gray-800">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-red-900 bg-red-950/20 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Settings className="size-4 text-red-400" />
          <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-500">
          Destructive or irreversible platform actions will appear here. These controls are restricted to super-admins.
        </p>
        <div className="rounded-lg bg-red-950/40 border border-red-900 px-4 py-3">
          <p className="text-xs text-red-400/80 italic">No destructive actions are currently configured.</p>
        </div>
      </section>
    </div>
  );
}
