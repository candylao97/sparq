"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  useEffect(() => {
    fetch("/api/providers/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileData | null) => {
        if (data) {
          reset({
            businessName: data.businessName ?? "",
            bio: data.bio ?? "",
          });
          setProfilePhotoUrl(data.profilePhoto ?? null);
          setPortfolioImages(data.portfolioImages ?? []);
          setModerationStatus(data.moderationStatus);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

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
    </div>
  );
}
