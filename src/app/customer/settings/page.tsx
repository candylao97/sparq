"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const updateLink =
  "text-sm font-medium text-neutral-900 underline-offset-2 hover:underline";

export default function CustomerSettingsPage() {
  const { update } = useSession();

  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfile({
            name: data.name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
          });
        }
      })
      .catch(() => {});
  }, []);

  function startEditProfile() {
    const parts = (profile.name ?? "").trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? "";
    const lastName = parts.join(" ");
    setProfileDraft({ firstName, lastName, email: profile.email, phone: profile.phone });
    setEditingProfile(true);
  }

  async function saveProfile() {
    const name = [profileDraft.firstName.trim(), profileDraft.lastName.trim()]
      .filter(Boolean)
      .join(" ");
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: profileDraft.email,
          phone: profileDraft.phone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        setSavingProfile(false);
        return;
      }
      setProfile({
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
      });
      await update({ name: data.name, email: data.email });
      toast.success("Personal information updated");
      setEditingProfile(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
        Settings
      </h1>

      {/* Personal information */}
      <section>
        {!editingProfile ? (
          <div className="space-y-1">
            <p className="text-lg font-semibold text-neutral-900">
              {profile.name || "Your name"}
            </p>
            <p className="text-neutral-600">{profile.email}</p>
            {profile.phone && <p className="text-neutral-600">{profile.phone}</p>}
            <button onClick={startEditProfile} className={`${updateLink} pt-2`}>
              Update personal information
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-neutral-900">
              Personal information
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
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={profileDraft.phone}
                onChange={(e) =>
                  setProfileDraft({ ...profileDraft, phone: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingProfile(false)}
                disabled={savingProfile}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      <hr className="border-neutral-200" />

      {/* Password */}
      <section>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-neutral-900">Password</p>
          <p className="select-none text-2xl leading-none tracking-widest text-neutral-400">
            ••••••••
          </p>
          <Link
            href="/customer/settings/password"
            className={`${updateLink} inline-block pt-2`}
          >
            Update password
          </Link>
        </div>
      </section>

      <hr className="border-neutral-200" />
    </div>
  );
}
