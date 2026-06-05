"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function CancelBookingButton({
  bookingId,
  size = "sm",
  className,
}: {
  bookingId: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function confirmCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || "Cancelled by customer" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to cancel booking");
        setLoading(false);
        return;
      }
      toast.success("Booking cancelled");
      setOpen(false);
      setLoading(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        Cancel
      </Button>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              This cancels your booking and releases any payment authorisation.
              This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason (optional)
            </label>
            <Textarea
              rows={3}
              placeholder="Let the artist know why…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Keep booking
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={loading}
            >
              {loading ? "Cancelling…" : "Yes, cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
