"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Scissors,
  CalendarDays,
  BookOpen,
  DollarSign,
  Star,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/provider", label: "Overview", icon: LayoutDashboard },
  { href: "/provider/profile", label: "Profile", icon: User },
  { href: "/provider/services", label: "Services", icon: Scissors },
  { href: "/provider/availability", label: "Availability", icon: CalendarDays },
  { href: "/provider/bookings", label: "Bookings", icon: BookOpen },
  { href: "/provider/earnings", label: "Earnings", icon: DollarSign },
  { href: "/provider/reviews", label: "Reviews", icon: Star },
  { href: "/provider/settings", label: "Settings", icon: Settings },
];

/**
 * Pure active-path matcher. The Overview root ("/provider") matches only on an
 * exact path; every other link matches on exact path or a nested sub-path.
 */
export function isProviderNavActive(href: string, pathname: string): boolean {
  return href === "/provider"
    ? pathname === "/provider"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => isProviderNavActive(href, pathname);
}

export function ProviderNavSidebar() {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
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
    </nav>
  );
}

export function ProviderNavMobile() {
  const isActive = useActive();
  return (
    <div className="flex overflow-x-auto scrollbar-hide">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
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
