"use client";

import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddPaymentMethodButton({
  label = "Add payment method",
}: {
  label?: string;
}) {
  return (
    <a
      href="https://link.com/au"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ size: "sm" }))}
    >
      <Plus className="size-4" />
      {label}
    </a>
  );
}
