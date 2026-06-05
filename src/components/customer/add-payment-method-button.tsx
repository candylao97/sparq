"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddPaymentMethodButton({
  label = "Add payment method",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/billing-portal", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || "Couldn't open billing.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={openPortal} disabled={loading}>
      <Plus className="size-4" />
      {loading ? "Opening…" : label}
    </Button>
  );
}
