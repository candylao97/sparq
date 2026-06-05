import Link from "next/link";
import { CreditCard, Receipt, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getCustomerBookings } from "@/server/services/booking.service";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";

type CustomerBooking = Awaited<ReturnType<typeof getCustomerBookings>>[number];

function money(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function providerName(b: CustomerBooking) {
  return b.provider.businessName || b.provider.user.name || "Artist";
}

function paymentStatusClass(status: string) {
  switch (status) {
    case "CAPTURED":
      return "bg-green-100 text-green-800";
    case "AUTHORISED":
    case "AUTH_PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "REFUNDED":
      return "bg-purple-100 text-purple-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export default async function CustomerPaymentsPage() {
  const session = await auth();
  const bookings = session?.user
    ? await getCustomerBookings(session.user.id)
    : [];

  const charges = bookings
    .filter((b) => b.payment)
    .sort(
      (a, b) =>
        new Date(b.payment!.createdAt).getTime() -
        new Date(a.payment!.createdAt).getTime()
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Payments &amp; receipts
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Your charges and saved payment method.
        </p>
      </div>

      {/* Saved payment method (stub) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
          <CreditCard className="size-4 text-neutral-400" />
          Payment method
        </h2>
        <div className="flex items-center justify-between rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-sm text-neutral-500">
            No saved card on file. Your card is entered securely at checkout for
            each booking.
          </p>
        </div>
      </section>

      {/* Charges */}
      <section className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
          <Receipt className="size-4 text-neutral-400" />
          <h2 className="font-semibold text-neutral-900">Charges</h2>
        </div>

        {charges.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">
            No charges yet. Your receipts will appear here after your first
            booking.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {charges.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/customer/bookings/${b.id}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {b.service.title}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {format(new Date(b.payment!.createdAt), "d MMM yyyy")} ·{" "}
                      {providerName(b)}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusClass(
                        b.payment!.status
                      )}`}
                    >
                      {PAYMENT_STATUS_LABELS[b.payment!.status] ??
                        b.payment!.status}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {money(b.payment!.amount)}
                    </span>
                    <ArrowRight className="size-4 text-neutral-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
