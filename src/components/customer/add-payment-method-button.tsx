"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

function SetupForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (error) {
      toast.error(error.message ?? "Couldn't save payment method");
      setLoading(false);
      return;
    }
    toast.success("Payment method saved");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || loading}>
        {loading ? "Saving…" : "Save payment method"}
      </Button>
    </form>
  );
}

export function AddPaymentMethodButton({
  label = "Add payment method",
}: {
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function start() {
    setStarting(true);
    try {
      if (!stripePromise) {
        toast.error("Payments aren't configured yet.");
        return;
      }
      const res = await fetch("/api/customer/setup-intent", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.clientSecret) {
        toast.error(data.error || "Couldn't start checkout.");
        return;
      }
      setClientSecret(data.clientSecret);
      setOpen(true);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={start} disabled={starting}>
        <Plus className="size-4" />
        {starting ? "Loading…" : label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add payment method</DialogTitle>
            <DialogDescription>
              Save a card or pay faster with Link.
            </DialogDescription>
          </DialogHeader>

          {clientSecret && stripePromise && (
            <div className="mt-4">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <SetupForm
                  onDone={() => {
                    setOpen(false);
                    setClientSecret(null);
                    router.refresh();
                  }}
                />
              </Elements>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
