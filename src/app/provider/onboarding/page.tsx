"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LAUNCH_SUBURBS } from "@/lib/constants";
import { toast } from "sonner";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
} from "lucide-react";

const STEPS = [
  "Basic Info",
  "Location",
  "Business Details",
  "Portfolio",
  "Services",
  "Availability",
  "Payout Details",
  "Review & Submit",
];

function maskAccount(accountNumber?: string | null) {
  if (!accountNumber) return null;
  const last4 = accountNumber.slice(-4);
  return `••••${last4}`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    businessName: "",
    bio: "",
    serviceTypes: [] as string[],
    serviceMode: "BOTH" as string,
    studioAddress: "",
    studioSuburb: "",
    mobileRadius: 10,
    suburbs: [] as string[],
    abn: "",
    yearsExperience: 0,
  });
  const [services, setServices] = useState<{
    title: string;
    category: string;
    description: string;
    durationMinutes: number;
    basePrice: number;
    serviceMode: string;
  }[]>([]);
  const [availability, setAvailability] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      startTime: "09:00",
      endTime: "17:00",
      enabled: i >= 1 && i <= 5,
    }))
  );
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newService, setNewService] = useState({
    title: "",
    category: "NAILS",
    description: "",
    durationMinutes: 60,
    basePrice: 50,
    serviceMode: "BOTH",
  });
  const [payout, setPayout] = useState({
    accountName: "",
    bsb: "",
    accountNumber: "",
  });
  const [currentStatus, setCurrentStatus] = useState<string>("DRAFT");

  // Load existing profile data
  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.ok ? res.json() : null)
      .catch(() => null);

    fetch("/api/providers/payout")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPayout({
            accountName: data.accountName ?? "",
            bsb: data.bsb ?? "",
            accountNumber: data.accountNumber ?? "",
          });
        }
      })
      .catch(() => null);
  }, []);

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save profile");
        return false;
      }
      toast.success("Profile saved");
      return true;
    } catch {
      toast.error("Failed to save profile");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step <= 2) {
      const saved = await saveProfile();
      if (!saved) return;
    }
    if (step === 6) {
      const saved = await savePayout();
      if (!saved) return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleAddService = async () => {
    if (!newService.title || newService.basePrice <= 0) {
      toast.error("Please fill in service title and price");
      return;
    }

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to add service");
        return;
      }
      const service = await res.json();
      setServices([...services, service]);
      setNewService({
        title: "",
        category: "NAILS",
        description: "",
        durationMinutes: 60,
        basePrice: 50,
        serviceMode: "BOTH",
      });
      toast.success("Service added");
    } catch {
      toast.error("Failed to add service");
    }
  };

  const handleSaveAvailability = async () => {
    const rules = availability
      .filter((a) => a.enabled)
      .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

    try {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) throw new Error();
      toast.success("Availability saved");
    } catch {
      toast.error("Failed to save availability");
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "portfolio");

    setLoading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPortfolioImages([...portfolioImages, data.url]);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  const savePayout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers/payout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payout),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save payout details");
        return false;
      }
      toast.success("Payout details saved");
      return true;
    } catch {
      toast.error("Failed to save payout details");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers/submit", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit");
        return;
      }
      setCurrentStatus("SUBMITTED");
      toast.success("Profile submitted for review!");
      router.push("/provider");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceType = (type: string) => {
    setProfile((p) => ({
      ...p,
      serviceTypes: p.serviceTypes.includes(type)
        ? p.serviceTypes.filter((t) => t !== type)
        : [...p.serviceTypes, type],
    }));
  };

  const toggleSuburb = (suburb: string) => {
    setProfile((p) => ({
      ...p,
      suburbs: p.suburbs.includes(suburb)
        ? p.suburbs.filter((s) => s !== suburb)
        : [...p.suburbs, suburb],
    }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Provider Onboarding</h1>
      <p className="text-gray-600 mb-6">Complete your profile to start receiving bookings</p>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i <= step && setStep(i)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              i === step
                ? "bg-neutral-900 text-white"
                : i < step
                ? "bg-neutral-100 text-neutral-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{s}</span>
          </button>
        ))}
      </div>

      {/* Step 0: Basic Info */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Tell us about yourself and your services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                placeholder="e.g., Lisa's Nail Studio"
              />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell customers about your experience, specialties, and what makes you unique..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Types</Label>
              <div className="flex gap-3">
                {["NAILS", "LASHES"].map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition ${
                      profile.serviceTypes.includes(type)
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200"
                    }`}
                  >
                    <Checkbox
                      checked={profile.serviceTypes.includes(type)}
                      onCheckedChange={() => toggleServiceType(type)}
                    />
                    <span>{type === "NAILS" ? "Nails" : "Lashes"}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Location */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Location & Coverage</CardTitle>
            <CardDescription>Where do you offer your services?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Service Mode</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "STUDIO", label: "Studio Only" },
                  { value: "MOBILE", label: "Mobile Only" },
                  { value: "BOTH", label: "Both" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setProfile({ ...profile, serviceMode: value })}
                    className={`p-3 border rounded-lg text-sm text-center transition ${
                      profile.serviceMode === value
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(profile.serviceMode === "STUDIO" || profile.serviceMode === "BOTH") && (
              <>
                <div className="space-y-2">
                  <Label>Studio Address</Label>
                  <Input
                    value={profile.studioAddress}
                    onChange={(e) => setProfile({ ...profile, studioAddress: e.target.value })}
                    placeholder="123 Collins Street"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Studio Suburb</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={profile.studioSuburb}
                    onChange={(e) => setProfile({ ...profile, studioSuburb: e.target.value })}
                  >
                    <option value="">Select suburb</option>
                    {LAUNCH_SUBURBS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(profile.serviceMode === "MOBILE" || profile.serviceMode === "BOTH") && (
              <div className="space-y-2">
                <Label>Mobile Service Radius (km)</Label>
                <Input
                  type="number"
                  value={profile.mobileRadius}
                  onChange={(e) => setProfile({ ...profile, mobileRadius: Number(e.target.value) })}
                  min={1}
                  max={50}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Suburbs Served</Label>
              <div className="grid grid-cols-2 gap-2">
                {LAUNCH_SUBURBS.map((suburb) => (
                  <label
                    key={suburb}
                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm transition ${
                      profile.suburbs.includes(suburb)
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200"
                    }`}
                  >
                    <Checkbox
                      checked={profile.suburbs.includes(suburb)}
                      onCheckedChange={() => toggleSuburb(suburb)}
                    />
                    {suburb}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Business Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ABN (Australian Business Number)</Label>
              <Input
                value={profile.abn}
                onChange={(e) => setProfile({ ...profile, abn: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                placeholder="12345678901"
                maxLength={11}
              />
              <p className="text-xs text-gray-500">11 digits, no spaces</p>
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input
                type="number"
                value={profile.yearsExperience}
                onChange={(e) => setProfile({ ...profile, yearsExperience: Number(e.target.value) })}
                min={0}
                max={50}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Portfolio */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
            <CardDescription>Upload images of your work to attract customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {portfolioImages.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleUploadImage}
                  disabled={loading}
                />
              </label>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Services */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Services</CardTitle>
            <CardDescription>Add the services you offer with pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.length > 0 && (
              <div className="space-y-2 mb-4">
                {services.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-sm text-gray-500">{s.durationMinutes} min</p>
                    </div>
                    <span className="font-semibold">${s.basePrice}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-sm">Add a service</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={newService.title}
                    onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                    placeholder="Gel Manicure"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                  >
                    <option value="NAILS">Nails</option>
                    <option value="LASHES">Lashes</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={newService.durationMinutes}
                    onChange={(e) => setNewService({ ...newService, durationMinutes: Number(e.target.value) })}
                    min={15}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price ($)</Label>
                  <Input
                    type="number"
                    value={newService.basePrice}
                    onChange={(e) => setNewService({ ...newService, basePrice: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  rows={2}
                />
              </div>
              <Button size="sm" onClick={handleAddService}>Add Service</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Availability */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Availability</CardTitle>
            <CardDescription>Set your regular working hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day, i) => (
              <div key={day} className="flex items-center gap-3 py-2">
                <label className="flex items-center gap-2 w-28">
                  <Checkbox
                    checked={availability[i].enabled}
                    onCheckedChange={(checked) => {
                      const updated = [...availability];
                      updated[i] = { ...updated[i], enabled: !!checked };
                      setAvailability(updated);
                    }}
                  />
                  <span className="text-sm font-medium">{day}</span>
                </label>
                {availability[i].enabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-32"
                      value={availability[i].startTime}
                      onChange={(e) => {
                        const updated = [...availability];
                        updated[i] = { ...updated[i], startTime: e.target.value };
                        setAvailability(updated);
                      }}
                    />
                    <span className="text-gray-400">to</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={availability[i].endTime}
                      onChange={(e) => {
                        const updated = [...availability];
                        updated[i] = { ...updated[i], endTime: e.target.value };
                        setAvailability(updated);
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Unavailable</span>
                )}
              </div>
            ))}
            <Button onClick={handleSaveAvailability} className="mt-4">
              Save Availability
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Payout details */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout Details</CardTitle>
            <CardDescription>
              Enter the Australian bank account where you&apos;d like to receive your earnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Account name</Label>
              <Input
                value={payout.accountName}
                onChange={(e) => setPayout({ ...payout, accountName: e.target.value })}
                placeholder="Name on the bank account"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BSB</Label>
                <Input
                  value={payout.bsb}
                  onChange={(e) => setPayout({ ...payout, bsb: e.target.value })}
                  placeholder="062-000"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label>Account number</Label>
                <Input
                  value={payout.accountNumber}
                  onChange={(e) =>
                    setPayout({ ...payout, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                  placeholder="12345678"
                  inputMode="numeric"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Your earnings are transferred to this account after each completed booking.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 7: Review & Submit */}
      {step === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Review your profile before submitting for approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Business Name</span>
                <span className="font-medium">{profile.businessName || "Not set"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Service Types</span>
                <span>{profile.serviceTypes.join(", ") || "Not set"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Service Mode</span>
                <span>{profile.serviceMode}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Suburbs</span>
                <span>{profile.suburbs.join(", ") || "Not set"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">ABN</span>
                <span>{profile.abn || "Not set"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Services</span>
                <span>{services.length} service(s)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Portfolio Images</span>
                <span>{portfolioImages.length} image(s)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Payout account</span>
                <span className="font-medium">
                  {maskAccount(payout.accountNumber)
                    ? `${payout.bsb} · ${maskAccount(payout.accountNumber)}`
                    : "Not set"}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800">
              <p className="font-medium mb-1">Anti-circumvention acknowledgment</p>
              <p>
                By submitting, you agree to conduct all bookings and payments through the Sparq platform.
                Direct arrangements with customers discovered through Sparq may result in account suspension.
              </p>
            </div>

            {currentStatus === "SUBMITTED" ? (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-700 font-medium">
                  Your profile has been submitted and is under review
                </span>
              </div>
            ) : (
              <Button
                onClick={handleSubmitForApproval}
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={handleNext} disabled={loading}>
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
