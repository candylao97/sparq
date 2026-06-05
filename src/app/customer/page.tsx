import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import { auth } from "@/lib/auth";
import { getCustomerBookings } from "@/server/services/booking.service";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/customer/cancel-booking-button";
import { RebookBanner } from "@/components/customer/rebook-banner";

const UPCOMING_STATUSES = ["PENDING_PROVIDER_RESPONSE", "CONFIRMED"];

type CustomerBooking = Awaited<ReturnType<typeof getCustomerBookings>>[number];

function money(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function providerName(b: CustomerBooking) {
  return b.provider.businessName || b.provider.user.name || "Artist";
}

function statusPillClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "PENDING_PROVIDER_RESPONSE":
      return "bg-yellow-100 text-yellow-800";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800";
    case "REFUNDED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export default async function CustomerAccountPage() {
  const session = await auth();
  const bookings = session?.user
    ? await getCustomerBookings(session.user.id)
    : [];

  const today = startOfDay(new Date());

  const nextBooking =
    bookings
      .filter(
        (b) =>
          UPCOMING_STATUSES.includes(b.status) &&
          startOfDay(new Date(b.bookingDate)) >= today
      )
      .sort((a, b) => {
        const d =
          new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      })[0] ?? null;

  const lastCompleted = bookings.find((b) => b.status === "COMPLETED") ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
        Account
      </h1>

      {/* Contextual prompt */}
      {lastCompleted && (
        <RebookBanner
          providerName={providerName(lastCompleted)}
          href={`/providers/${lastCompleted.providerId}/book?serviceId=${lastCompleted.serviceId}`}
          dismissKey={lastCompleted.id}
        />
      )}

      {/* Focal: next appointment */}
      {nextBooking ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Your next appointment
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClass(
                nextBooking.status
              )}`}
            >
              {BOOKING_STATUS_LABELS[nextBooking.status] ?? nextBooking.status}
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                {nextBooking.provider.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={nextBooking.provider.user.image}
                    alt={providerName(nextBooking)}
                    className="size-full object-cover"
                  />
                ) : (
                  <Sparkles className="size-5 text-neutral-400" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-neutral-900">
                  {nextBooking.service.title}
                </h2>
                <p className="text-sm text-neutral-500">
                  with {providerName(nextBooking)}
                </p>
              </div>
              <span className="ml-auto shrink-0 text-lg font-semibold text-neutral-900">
                {money(nextBooking.totalPrice)}
              </span>
            </div>

            {/* Nested detail box */}
            <div className="mt-4 space-y-2 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-neutral-400" />
                {format(new Date(nextBooking.bookingDate), "EEEE, d MMMM yyyy")}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-neutral-400" />
                {nextBooking.startTime} – {nextBooking.endTime}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-neutral-400" />
                {nextBooking.serviceMode === "MOBILE"
                  ? `Mobile · ${nextBooking.address ?? "Your address"}`
                  : `Studio · ${
                      nextBooking.provider.studioSuburb ??
                      nextBooking.provider.studioAddress ??
                      "Artist's studio"
                    }`}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/customer/bookings/${nextBooking.id}`}>
                <Button size="sm">View details</Button>
              </Link>
              <CancelBookingButton bookingId={nextBooking.id} />
              <Link
                href={`/providers/${nextBooking.providerId}/book?serviceId=${nextBooking.serviceId}`}
              >
                <Button variant="ghost" size="sm">
                  Book again
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center">
          <CalendarDays className="mb-3 size-10 text-neutral-300" />
          <p className="font-medium text-neutral-700">No upcoming appointments</p>
          <p className="mt-1 text-sm text-neutral-400">
            Book a nail or lash artist to see it here.
          </p>
          <Link href="/providers" className="mt-5">
            <Button>
              Browse services
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Footer */}
      <p className="pt-2 text-sm text-neutral-500">
        Questions?{" "}
        <Link href="/contact" className="font-medium text-neutral-900 hover:underline">
          Reach out to us.
        </Link>
      </p>
    </div>
  );
}
