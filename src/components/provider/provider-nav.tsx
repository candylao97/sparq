"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Scissors,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/provider", label: "Bookings", icon: BookOpen },
  { href: "/provider/availability", label: "Availability", icon: CalendarDays },
  { href: "/provider/services", label: "Services", icon: Scissors },
  { href: "/provider/profile", label: "Profile", icon: User },
];

const SETTINGS_LINK = {
  href: "/provider/settings",
  label: "Settings",
  icon: Settings,
};

/**
 * Pure active-path matcher. The Bookings root ("/provider") matches only on an
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
  const renderLink = (
    { href, label, icon: Icon }: (typeof LINKS)[number],
    muted = false
  ) => {
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
            : muted
              ? "border-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              : "border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        )}
      >
        <Icon className="size-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => renderLink(link))}
      <div className="mt-2 flex flex-col gap-1 border-t border-neutral-200 pt-2">
        {renderLink(SETTINGS_LINK, true)}
      </div>
    </nav>
  );
}

export function ProviderNavMobile() {
  const isActive = useActive();
  const renderLink = (
    { href, label, icon: Icon }: (typeof LINKS)[number],
    muted = false
  ) => {
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
            : muted
              ? "text-neutral-400 hover:text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900"
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex overflow-x-auto scrollbar-hide">
      {LINKS.map((link) => renderLink(link))}
      <div className="ml-2 flex border-l border-neutral-200 pl-2">
        {renderLink(SETTINGS_LINK, true)}
      </div>
    </div>
  );
}
