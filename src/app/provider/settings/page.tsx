"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface StripeStatus {
  connected: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
}

export default function ProviderSettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  useEffect(() => {
    fetch("/api/stripe/connect")
      .then((r) => r.json())
      .then((data: StripeStatus) => setStripeStatus(data))
      .catch(() => {})
      .finally(() => setLoadingStripe(false));
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

  async function handleConnectStripe() {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Failed to start Stripe Connect");
      setConnectingStripe(false);
    }
  }

  const stripeFullyOnboarded =
    stripeStatus?.connected &&
    stripeStatus?.detailsSubmitted &&
    stripeStatus?.payoutsEnabled;

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

      {/* Stripe Connect */}
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStripe ? (
            <p className="text-sm text-muted-foreground">Checking Stripe status...</p>
          ) : stripeFullyOnboarded ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700">Stripe account connected</p>
                <p className="text-xs text-muted-foreground">
                  Your account is set up and payouts are enabled
                </p>
              </div>
              <Badge variant="green" className="ml-auto">Active</Badge>
            </div>
          ) : stripeStatus?.connected && !stripeFullyOnboarded ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5 text-yellow-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-700">Onboarding incomplete</p>
                  <p className="text-xs text-muted-foreground">
                    Complete your Stripe account setup to receive payouts
                  </p>
                </div>
                <Badge variant="yellow" className="ml-auto">Pending</Badge>
              </div>
              <Button variant="outline" onClick={handleConnectStripe} disabled={connectingStripe}>
                <ExternalLink className="size-4 mr-1.5" />
                {connectingStripe ? "Redirecting..." : "Complete Stripe setup"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to receive payouts when bookings are completed.
              </p>
              <Button onClick={handleConnectStripe} disabled={connectingStripe}>
                <ExternalLink className="size-4 mr-1.5" />
                {connectingStripe ? "Redirecting..." : "Connect with Stripe"}
              </Button>
            </div>
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
