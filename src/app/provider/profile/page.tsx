"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import { Upload, Trash2, Store, Home, MapPin, Check } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LAUNCH_SUBURBS } from "@/lib/constants";
import {
  providerLocationSchema,
  type ProviderLocationInput,
} from "@/server/validation/provider.schema";
import { ProviderReviews } from "@/components/provider/provider-reviews";

const SERVICE_MODE_OPTIONS = [
  { value: "STUDIO", label: "At my studio", icon: Store },
  { value: "MOBILE", label: "Client's home", icon: Home },
  { value: "BOTH", label: "Both", icon: MapPin },
] as const;

// Lightweight editor schema: businessName and bio are saved incrementally, so
// each field can be left empty without blocking a save of the other. We keep
// the upper bounds from providerProfileSchema but drop the min() requirements
// (those are enforced at submit-for-approval time, not on every partial save).
const publicProfileSchema = z.object({
  businessName: z.string().max(100, "Business name must be at most 100 characters"),
  bio: z.string().max(1000, "Bio must be at most 1000 characters"),
});

type PublicProfileInput = z.infer<typeof publicProfileSchema>;

const MODERATION_STATUS_MAP: Record<string, { label: string; variant: "yellow" | "blue" | "green" | "red" | "gray" }> = {
  PENDING: { label: "Pending Review", variant: "yellow" },
  APPROVED: { label: "Approved", variant: "green" },
  REJECTED: { label: "Rejected", variant: "red" },
  SUSPENDED: { label: "Suspended", variant: "red" },
};

interface ProfileData {
  businessName?: string | null;
  bio?: string | null;
  moderationStatus?: string;
  profilePhoto?: string | null;
  portfolioImages?: { id: string; url: string }[];
  serviceMode?: "STUDIO" | "MOBILE" | "BOTH" | null;
  studioAddress?: string | null;
  studioSuburb?: string | null;
  mobileRadius?: number | null;
  suburbs?: string[] | null;
}

function SectionHeading({ children, divider = true }: { children: React.ReactNode; divider?: boolean }) {
  return (
    <div className={divider ? "border-t border-border pt-6" : ""}>
      <h2 className="text-sm font-semibold">{children}</h2>
    </div>
  );
}

export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<{ id: string; url: string }[]>([]);
  const [moderationStatus, setModerationStatus] = useState<string | undefined>(undefined);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PublicProfileInput>({
    resolver: zodResolver(publicProfileSchema),
    defaultValues: {
      businessName: "",
      bio: "",
    },
  });

  const {
    register: registerLocation,
    handleSubmit: handleLocationSubmit,
    control,
    watch,
    reset: resetLocation,
    formState: { errors: locationErrors },
  } = useForm<ProviderLocationInput>({
    resolver: zodResolver(providerLocationSchema),
    defaultValues: {
      serviceMode: "STUDIO",
      studioAddress: "",
      studioSuburb: "",
      mobileRadius: undefined,
      suburbs: [],
    },
  });

  const serviceMode = watch("serviceMode");

  useEffect(() => {
    fetch("/api/providers/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileData | null) => {
        if (data) {
          reset({
            businessName: data.businessName ?? "",
            bio: data.bio ?? "",
          });
          resetLocation({
            serviceMode: data.serviceMode ?? "STUDIO",
            studioAddress: data.studioAddress ?? "",
            studioSuburb: data.studioSuburb ?? "",
            mobileRadius: data.mobileRadius ?? undefined,
            suburbs: data.suburbs ?? [],
          });
          setProfilePhotoUrl(data.profilePhoto ?? null);
          setPortfolioImages(data.portfolioImages ?? []);
          setModerationStatus(data.moderationStatus);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset, resetLocation]);

  const onSave = async (data: PublicProfileInput) => {
    setSaving(true);
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: data.businessName, bio: data.bio }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const onSaveLocation = async (data: ProviderLocationInput) => {
    setSavingLocation(true);
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceMode: data.serviceMode,
          studioAddress: data.studioAddress,
          studioSuburb: data.studioSuburb,
          mobileRadius: data.mobileRadius,
          suburbs: data.suburbs,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      toast.success("Location & coverage saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSavingLocation(false);
    }
  };

  const onSubmitForApproval = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/providers/submit", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submit failed");
      }
      toast.success("Profile submitted for approval");
      setModerationStatus("PENDING");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  async function uploadFile(file: File, type: "profile" | "portfolio") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<{ url: string; id?: string }>;
  }

  async function handleProfilePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { url } = await uploadFile(file, "profile");
      setProfilePhotoUrl(url);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handlePortfolioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingPortfolio(true);
    try {
      const results = await Promise.all(files.map((f) => uploadFile(f, "portfolio")));
      const newImages = results.map((r) => ({ id: r.id ?? crypto.randomUUID(), url: r.url }));
      setPortfolioImages((prev) => [...prev, ...newImages]);
      toast.success(`${files.length} image(s) uploaded`);
    } catch {
      toast.error("Failed to upload portfolio images");
    } finally {
      setUploadingPortfolio(false);
    }
  }

  const statusInfo = moderationStatus ? MODERATION_STATUS_MAP[moderationStatus] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your public provider page</p>
        </div>
        {statusInfo && (
          <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
            {statusInfo.label}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSave)} className="space-y-6">
            {/* Profile photo */}
            <div className="space-y-3">
              <SectionHeading divider={false}>Profile photo</SectionHeading>
              <div className="flex items-center gap-6">
                <div className="relative size-20 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                  {profilePhotoUrl ? (
                    <Image src={profilePhotoUrl} alt="Profile" fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                      No photo
                    </div>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
                    <Upload className="size-4" />
                    {uploadingPhoto ? "Uploading..." : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleProfilePhotoChange}
                      disabled={uploadingPhoto}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG, WEBP up to 5MB</p>
                </div>
              </div>
            </div>

            {/* Business name */}
            <div className="space-y-3">
              <SectionHeading>Business name</SectionHeading>
              <Input id="businessName" {...register("businessName")} placeholder="e.g. Luxe Nails Studio" />
              {errors.businessName && (
                <p className="text-sm text-red-500">{errors.businessName.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-3">
              <SectionHeading>Bio</SectionHeading>
              <Textarea
                id="bio"
                rows={5}
                {...register("bio")}
                placeholder="Tell customers about your experience, style, and what makes you stand out."
              />
              {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 border-t border-border pt-6">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onSubmitForApproval}
                disabled={submitting || moderationStatus === "PENDING" || moderationStatus === "APPROVED"}
              >
                {submitting ? "Submitting..." : "Submit for approval"}
              </Button>
            </div>
          </form>

          {/* Portfolio */}
          <div className="space-y-3">
            <SectionHeading>Portfolio</SectionHeading>
            {portfolioImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {portfolioImages.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group border border-border">
                    <Image src={img.url} alt="Portfolio" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setPortfolioImages((prev) => prev.filter((i) => i.id !== img.id))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      <Trash2 className="size-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
              <Upload className="size-4" />
              {uploadingPortfolio ? "Uploading..." : "Add portfolio images"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handlePortfolioUpload}
                disabled={uploadingPortfolio}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Location & coverage */}
      <Card>
        <CardContent className="space-y-6">
          <form onSubmit={handleLocationSubmit(onSaveLocation)} className="space-y-6">
            <div className="space-y-3">
              <SectionHeading divider={false}>Service area</SectionHeading>
              <p className="text-sm text-muted-foreground">
                Set how and where you offer your services.
              </p>
            </div>

            {/* Service mode */}
            <div className="space-y-2">
              <Label>Service mode</Label>
              <Controller
                name="serviceMode"
                control={control}
                render={({ field }) => (
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Service mode">
                    {SERVICE_MODE_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const active = field.value === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => field.onChange(value)}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                            active
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-border hover:border-muted-foreground"
                          }`}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="flex-1 font-medium">{label}</span>
                          {active && <Check className="size-4 text-indigo-600" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {(serviceMode === "STUDIO" || serviceMode === "BOTH") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="studioAddress">Studio address</Label>
                  <Input id="studioAddress" {...registerLocation("studioAddress")} />
                  {locationErrors.studioAddress && (
                    <p className="text-sm text-red-500">
                      {locationErrors.studioAddress.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studioSuburb">Studio suburb</Label>
                  <Input id="studioSuburb" {...registerLocation("studioSuburb")} />
                </div>
              </div>
            )}

            {(serviceMode === "MOBILE" || serviceMode === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="mobileRadius">Mobile radius (km)</Label>
                <Input
                  id="mobileRadius"
                  type="number"
                  min={1}
                  max={50}
                  {...registerLocation("mobileRadius", { valueAsNumber: true })}
                />
                {locationErrors.mobileRadius && (
                  <p className="text-sm text-red-500">
                    {locationErrors.mobileRadius.message}
                  </p>
                )}
              </div>
            )}

            {/* Service suburbs */}
            <div className="space-y-2">
              <Label>Service suburbs</Label>
              <Controller
                name="suburbs"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {LAUNCH_SUBURBS.map((suburb) => {
                      const checked = field.value.includes(suburb);
                      return (
                        <label
                          key={suburb}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                field.onChange(field.value.filter((s) => s !== suburb));
                              } else {
                                field.onChange([...field.value, suburb]);
                              }
                            }}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span className="text-sm">{suburb}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
              {locationErrors.suburbs && (
                <p className="text-sm text-red-500">{locationErrors.suburbs.message}</p>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <Button type="submit" disabled={savingLocation}>
                {savingLocation ? "Saving..." : "Save location"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Reviews */}
      <div className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Reviews from your customers
          </p>
        </div>
        <ProviderReviews />
      </div>
    </div>
  );
}
