"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Star, X } from "lucide-react";

export function ReviewPromptBanner({
  providerName,
  href,
  dismissKey,
}: {
  providerName: string;
  href: string;
  dismissKey: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(`review-dismissed:${dismissKey}`) !== "1");
    } catch {
      setShow(true);
    }
  }, [dismissKey]);

  if (!show) return null;

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(`review-dismissed:${dismissKey}`, "1");
    } catch {}
    setShow(false);
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100/80"
    >
      <Star className="size-5 shrink-0 fill-amber-400 text-amber-400" />
      <p className="min-w-0 flex-1 text-sm font-medium text-neutral-900">
        How was your visit with {providerName}? Leave a review
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-amber-200/60 hover:text-neutral-700"
      >
        <X className="size-4" />
      </button>
      <ChevronRight className="size-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
