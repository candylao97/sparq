import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getBookingById } from "@/server/services/booking.service";

function money(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function chargeStatusLabel(status?: string) {
  switch (status) {
    case "CAPTURED":
      return "Paid";
    case "AUTHORISED":
      return "Authorised";
    case "AUTH_PENDING":
      return "Pending";
    case "AUTH_RELEASED":
      return "Released";
    case "REFUNDED":
      return "Refunded";
    case "FAILED":
      return "Failed";
    default:
      return status ?? "—";
  }
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const booking = await getBookingById(id);

  if (!booking || !session?.user || booking.customerId !== session.user.id) {
    notFound();
  }

  const providerName =
    booking.provider.businessName || booking.provider.user.name || "Artist";
  const payment = booking.payment;
  const total = payment?.amount ?? booking.totalPrice;
  const chargedOn = payment?.capturedAt ?? payment?.createdAt ?? booking.createdAt;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link
        href="/customer/billing"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="size-4" />
        Back to billing
      </Link>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5">
          <div>
            <p className="text-xl font-bold tracking-tight text-neutral-900">
              Sparq
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">Receipt</p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            {chargeStatusLabel(payment?.status)}
          </span>
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-6 py-5 text-sm">
          <div>
            <dt className="text-neutral-400">Receipt no.</dt>
            <dd className="font-medium text-neutral-900">
              {booking.id.slice(-8).toUpperCase()}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-400">Date</dt>
            <dd className="font-medium text-neutral-900">
              {format(new Date(chargedOn), "d MMM yyyy")}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-400">Paid to</dt>
            <dd className="font-medium text-neutral-900">{providerName}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">Billed to</dt>
            <dd className="font-medium text-neutral-900">
              {session.user.name ?? session.user.email}
            </dd>
          </div>
        </dl>

        {/* Line item */}
        <div className="border-t border-neutral-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-neutral-900">
                {booking.service.title}
              </p>
              <p className="text-sm text-neutral-500">
                {format(new Date(booking.bookingDate), "EEE, d MMM yyyy")} ·{" "}
                {booking.startTime}
              </p>
            </div>
            <span className="font-medium text-neutral-900">{money(total)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-5">
          <span className="font-semibold text-neutral-900">Total</span>
          <span className="text-lg font-bold text-neutral-900">
            {money(total)}
          </span>
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 text-xs text-neutral-500">
          Paid securely through Sparq. Questions about this charge?{" "}
          <Link href="/contact" className="font-medium text-neutral-700 hover:underline">
            Contact us
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
