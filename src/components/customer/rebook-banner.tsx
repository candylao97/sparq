"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, RotateCcw } from "lucide-react";

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

  function dismiss() {
    try {
      localStorage.setItem(`rebook-dismissed:${dismissKey}`, "1");
    } catch {}
    setShow(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        <RotateCcw className="size-4" />
      </div>
      <p className="min-w-0 flex-1 text-sm text-neutral-700">
        Loved your last visit?{" "}
        <Link href={href} className="font-semibold text-neutral-900 hover:underline">
          Rebook with {providerName}
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
