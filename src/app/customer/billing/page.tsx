import Link from "next/link";
import { CreditCard, Receipt, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { getCustomerBookings } from "@/server/services/booking.service";
import { AddPaymentMethodButton } from "@/components/customer/add-payment-method-button";

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

function chargeStatusLabel(status: string) {
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
      return status;
  }
}

export default async function CustomerBillingPage() {
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
        <h1 className="text-2xl font-bold text-neutral-900">Billing</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your payment method and view your charges.
        </p>
      </div>

      {/* Payment method */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-neutral-900">
          <CreditCard className="size-4 text-neutral-400" />
          Payment method
        </h2>
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-500">
            Add or update the card and billing details used for your bookings.
            Cards are stored securely by Stripe.
          </p>
          <AddPaymentMethodButton />
        </div>
      </section>

      {/* Recent charges */}
      <section className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
          <Receipt className="size-4 text-neutral-400" />
          <h2 className="font-semibold text-neutral-900">Recent charges</h2>
        </div>

        {charges.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">
            No charges yet. Your receipts will appear here after your first
            booking.
          </p>
        ) : (
          <div>
            {/* Column headers (desktop) */}
            <div className="hidden grid-cols-[6rem_1fr_6rem_6rem_1.25rem] gap-3 border-b border-neutral-100 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:grid">
              <span>Date</span>
              <span>Name</span>
              <span>Price</span>
              <span>Status</span>
              <span />
            </div>

            <ul className="divide-y divide-neutral-100">
              {charges.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/customer/bookings/${b.id}/receipt`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50 sm:grid-cols-[6rem_1fr_6rem_6rem_1.25rem]"
                  >
                    <span className="order-2 text-xs text-neutral-400 sm:order-1 sm:text-sm sm:text-neutral-600">
                      {format(new Date(b.payment!.createdAt), "d MMM yyyy")}
                    </span>
                    <span className="order-1 min-w-0 truncate text-sm font-medium text-neutral-900 sm:order-2">
                      {b.service.title}
                      <span className="text-neutral-400 sm:hidden">
                        {" · "}
                        {providerName(b)}
                      </span>
                    </span>
                    <span className="order-3 text-sm font-semibold text-neutral-900">
                      {money(b.payment!.amount)}
                    </span>
                    <span className="order-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusClass(
                          b.payment!.status
                        )}`}
                      >
                        {chargeStatusLabel(b.payment!.status)}
                      </span>
                    </span>
                    <ChevronRight className="order-5 hidden size-4 text-neutral-300 sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
