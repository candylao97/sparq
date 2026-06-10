"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Settings, LogOut, ChevronDown } from "lucide-react";

const itemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100";

export function ProviderAccountMenu({
  name,
  email,
  image,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial =
    (name ?? email ?? "?").trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-neutral-200 py-1 pl-1 pr-2 transition-colors hover:bg-neutral-50"
      >
        <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-xs font-semibold text-white">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <ChevronDown className="size-4 text-neutral-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)]"
        >
          <div className="border-b border-neutral-100 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-neutral-900">
              {name ?? "Account"}
            </p>
            {email && (
              <p className="truncate text-xs text-neutral-500">{email}</p>
            )}
          </div>
          <div className="p-1">
            <Link
              href="/provider"
              onClick={() => setOpen(false)}
              className={itemClass}
              role="menuitem"
            >
              <LayoutDashboard className="size-4 text-neutral-400" />
              Overview
            </Link>
            <Link
              href="/provider/settings"
              onClick={() => setOpen(false)}
              className={itemClass}
              role="menuitem"
            >
              <Settings className="size-4 text-neutral-400" />
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className={`${itemClass} text-red-600 hover:bg-red-50`}
              role="menuitem"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
