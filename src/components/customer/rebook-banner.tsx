"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";

export function RebookBanner({
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
      setShow(localStorage.getItem(`rebook-dismissed:${dismissKey}`) !== "1");
    } catch {
      setShow(true);
    }
  }, [dismissKey]);

  if (!show) return null;

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(`rebook-dismissed:${dismissKey}`, "1");
    } catch {}
    setShow(false);
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl bg-neutral-100 px-5 py-4 transition-colors hover:bg-neutral-200/70"
    >
      <p className="min-w-0 flex-1 text-sm font-medium text-neutral-900">
        Loved your last visit? Rebook with {providerName}
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-300/50 hover:text-neutral-700"
      >
        <X className="size-4" />
      </button>
      <ChevronRight className="size-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
