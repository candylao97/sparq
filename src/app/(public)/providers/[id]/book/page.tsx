"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Service = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  durationMinutes: number;
  basePrice: number;
  serviceMode: string;
};

type ProviderData = {
  id: string;
  businessName: string | null;
  serviceMode: string;
  user: { name: string | null };
  services: Service[];
};

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const providerId = params.id as string;
  const preselectedServiceId = searchParams.get("serviceId");

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [serviceMode, setServiceMode] = useState<"STUDIO" | "MOBILE">("STUDIO");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch provider data
  useEffect(() => {
    fetch(`/api/providers/${providerId}`)
      .then((res) => res.json())
      .then((data) => {
        setProvider(data);
        if (preselectedServiceId) {
          const svc = data.services?.find((s: Service) => s.id === preselectedServiceId);
          if (svc) setSelectedService(svc);
        }
      });
  }, [providerId, preselectedServiceId]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    setLoadingSlots(true);
    setSelectedSlot("");

    fetch(
      `/api/availability?profileId=${providerId}&date=${selectedDate}&duration=${selectedService.durationMinutes}`
    )
      .then((res) => res.json())
      .then((data) => {
        setAvailableSlots(data.slots || []);
        setLoadingSlots(false);
      });
  }, [selectedDate, selectedService, providerId]);

  if (!session?.user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold mb-4">Sign in to book</h2>
        <p className="text-gray-600 mb-6">You need an account to make a booking.</p>
        <Link href={`/login?callbackUrl=/providers/${providerId}/book`}>
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const name = provider.businessName || provider.user.name || "Provider";

  // Generate next 14 days for date selection
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    return { value: format(date, "yyyy-MM-dd"), label: format(date, "EEE, d MMM") };
  });

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) {
      toast.error("Please select a service, date, and time slot");
      return;
    }

    if (serviceMode === "MOBILE" && !address) {
      toast.error("Please enter your address for mobile service");
      return;
    }

    setLoading(true);

    try {
      // For MVP, we use a placeholder payment method
      // In production, integrate Stripe Elements here
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          serviceId: selectedService.id,
          bookingDate: selectedDate,
          startTime: selectedSlot,
          serviceMode,
          address: serviceMode === "MOBILE" ? address : undefined,
          notes: notes || undefined,
          paymentMethodId: "pm_card_visa", // Stripe test card
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Failed to create booking");
        setLoading(false);
        return;
      }

      toast.success("Booking request submitted!");
      router.push("/customer/bookings");
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/providers/${providerId}`}
        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {name}
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-6">
        Book with {name}
      </h1>

      {/* Step 1: Select Service */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">1. Select a service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {provider.services.map((service) => (
            <button
              key={service.id}
              onClick={() => {
                setSelectedService(service);
                setSelectedSlot("");
                setAvailableSlots([]);
              }}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selectedService?.id === service.id
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{service.title}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {service.durationMinutes} min
                  </p>
                </div>
                <span className="font-semibold">${service.basePrice}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Step 2: Select Date */}
      {selectedService && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              2. Select a date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {dates.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedDate(value)}
                  className={`p-2 text-sm rounded-lg border text-center transition ${
                    selectedDate === value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Time */}
      {selectedDate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              3. Select a time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <p className="text-sm text-gray-500">Loading available times...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-gray-500">No available slots on this date. Try another day.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 text-sm rounded-lg border text-center transition ${
                      selectedSlot === slot
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Service Mode & Details */}
      {selectedSlot && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              4. Service details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(provider.serviceMode === "BOTH" ||
              selectedService?.serviceMode === "BOTH") && (
              <div className="space-y-2">
                <Label>Service location</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setServiceMode("STUDIO")}
                    className={`p-3 border rounded-lg text-sm text-center transition ${
                      serviceMode === "STUDIO"
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-gray-200"
                    }`}
                  >
                    Studio visit
                  </button>
                  <button
                    onClick={() => setServiceMode("MOBILE")}
                    className={`p-3 border rounded-lg text-sm text-center transition ${
                      serviceMode === "MOBILE"
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-gray-200"
                    }`}
                  >
                    Home visit
                  </button>
                </div>
              </div>
            )}

            {serviceMode === "MOBILE" && (
              <div className="space-y-2">
                <Label htmlFor="address">Your address</Label>
                <Input
                  id="address"
                  placeholder="Enter your full address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Payment & Summary */}
      {selectedSlot && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              5. Confirm & pay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service</span>
                <span className="font-medium">{selectedService?.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">
                  {format(new Date(selectedDate), "EEE, d MMMM yyyy")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Time</span>
                <span className="font-medium">{selectedSlot}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{selectedService?.durationMinutes} min</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">${selectedService?.basePrice}</span>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
              Your card will be authorised but not charged until the provider accepts your booking.
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full rounded-full bg-neutral-900 text-base text-white hover:bg-neutral-700"
              size="lg"
              disabled={loading}
            >
              {loading ? "Submitting…" : `Request booking · $${selectedService?.basePrice}`}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By booking, you agree to our{" "}
              <Link href="/terms" className="underline">Terms</Link> and{" "}
              <Link href="/cancellation-policy" className="underline">Cancellation Policy</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
