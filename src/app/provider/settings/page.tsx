"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  splitName,
  joinName,
  maskAccountNumber,
  maskBsb,
} from "@/lib/account-display";

const updateLink =
  "text-sm font-medium text-neutral-900 underline-offset-2 hover:underline";

export default function ProviderSettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  // Payout (bank) details
  const [accountName, setAccountName] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loadingPayout, setLoadingPayout] = useState(true);
  const [savingPayout, setSavingPayout] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  useEffect(() => {
    fetch("/api/providers/payout")
      .then((r) => (r.ok ? r.json() : {}))
      .then(
        (data: {
          accountName?: string | null;
          bsb?: string | null;
          accountNumber?: string | null;
        }) => {
          setAccountName(data?.accountName ?? "");
          setBsb(data?.bsb ?? "");
          setAccountNumber(data?.accountNumber ?? "");
        }
      )
      .catch(() => {})
      .finally(() => setLoadingPayout(false));
  }, []);

  function startEditProfile() {
    const { firstName, lastName } = splitName(name);
    setProfileDraft({ firstName, lastName, email });
    setEditingProfile(true);
  }

  async function saveProfile() {
    const nextName = joinName(profileDraft.firstName, profileDraft.lastName);
    const nextEmail = profileDraft.email;
    if (!nextName.trim() || !nextEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, email: nextEmail }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      await update({ name: nextName, email: nextEmail });
      setName(nextName);
      setEmail(nextEmail);
      toast.success("Profile updated");
      setEditingProfile(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePayout() {
    setSavingPayout(true);
    try {
      const res = await fetch("/api/providers/payout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, bsb, accountNumber }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      toast.success("Payout details saved");
      setEditingPayout(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payout details");
    } finally {
      setSavingPayout(false);
    }
  }

  const hasPayout = Boolean(accountName || bsb || accountNumber);

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
        Settings
      </h1>

      {/* Account details */}
      <section>
        {!editingProfile ? (
          <div className="space-y-1">
            <p className="text-lg font-semibold text-neutral-900">
              {name || "Your name"}
            </p>
            <p className="text-neutral-600">{email}</p>
            <button onClick={startEditProfile} className={`${updateLink} pt-2`}>
              Update account details
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-neutral-900">
              Account details
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={profileDraft.firstName}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={profileDraft.lastName}
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={profileDraft.email}
                onChange={(e) =>
                  setProfileDraft({ ...profileDraft, email: e.target.value })
                }
              />
            </div>
            <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </section>

      <hr className="border-neutral-200" />

      {/* Payout details */}
      <section>
        {!editingPayout ? (
          <div className="space-y-1">
            <p className="text-lg font-semibold text-neutral-900">
              Payout details
            </p>
            {loadingPayout ? (
              <p className="text-neutral-600">Loading…</p>
            ) : hasPayout ? (
              <div className="space-y-0.5 text-neutral-600">
                {accountName && <p>{accountName}</p>}
                <p className="tracking-wide">
                  {[maskBsb(bsb), maskAccountNumber(accountNumber)]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              </div>
            ) : (
              <p className="text-neutral-600">Not set up yet</p>
            )}
            <p className="pt-1 text-sm text-neutral-600">
              Your earnings are paid to this Australian bank account after each
              completed booking.
            </p>
            {!loadingPayout && (
              <button
                onClick={() => setEditingPayout(true)}
                className={`${updateLink} pt-2`}
              >
                Update payout details
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-neutral-900">
              Payout details
            </p>
            <p className="text-sm text-neutral-600">
              Your earnings are paid to this Australian bank account after each
              completed booking.
            </p>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Name on the bank account"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bsb">BSB</Label>
                <Input
                  id="bsb"
                  value={bsb}
                  onChange={(e) => setBsb(e.target.value)}
                  placeholder="062-000"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account number</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="12345678"
                  inputMode="numeric"
                />
              </div>
            </div>
            <Button size="sm" onClick={savePayout} disabled={savingPayout}>
              {savingPayout ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </section>

      <hr className="border-neutral-200" />
    </div>
  );
}
