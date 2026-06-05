"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  Star,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/customer", label: "Account", icon: LayoutDashboard },
  { href: "/customer/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/customer/payments", label: "Payments & receipts", icon: CreditCard },
  { href: "/customer/reviews", label: "Reviews", icon: Star },
  { href: "/customer/settings", label: "Settings", icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/customer"
      ? pathname === "/customer"
      : pathname === href || pathname.startsWith(`${href}/`);
}

export function CustomerNavSidebar() {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              active
                ? "border-neutral-900 bg-white font-semibold text-neutral-900"
                : "border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="mt-2 flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
      >
        <LogOut className="size-4 shrink-0" />
        Sign out
      </button>
    </nav>
  );
}

export function CustomerNavMobile() {
  const isActive = useActive();
  return (
    <div className="flex overflow-x-auto scrollbar-hide">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-shrink-0 flex-col items-center gap-1 px-4 py-3 text-xs font-medium transition-colors",
              active
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
