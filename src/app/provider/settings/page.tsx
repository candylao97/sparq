"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProviderSettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Payout (bank) details
  const [accountName, setAccountName] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loadingPayout, setLoadingPayout] = useState(true);
  const [savingPayout, setSavingPayout] = useState(false);

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

  async function saveProfile() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      await update({ name, email });
      toast.success("Profile updated");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payout details");
    } finally {
      setSavingPayout(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account settings</p>
      </div>

      {/* Account details */}
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Payout details */}
      <Card>
        <CardHeader>
          <CardTitle>Payout details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Your earnings are paid to this Australian bank account after each
            completed booking.
          </p>
          {loadingPayout ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
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
              <Button onClick={savePayout} disabled={savingPayout}>
                {savingPayout ? "Saving..." : "Save payout details"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="destructive" disabled>
            Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
