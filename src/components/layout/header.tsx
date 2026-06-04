"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Drawer } from "@base-ui/react/drawer";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Services", href: "/services" },
  { label: "Providers", href: "/providers" },
];

function getDashboardPath(role?: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "PROVIDER") return "/provider";
  return "/customer";
}

export function Header() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = status === "authenticated";
  const dashboardPath = getDashboardPath(session?.user?.role);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              Sparq
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href={dashboardPath}
                  className="inline-flex items-center justify-center rounded-full px-4 h-9 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200 px-4 h-9 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full px-4 h-9 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full px-5 h-9 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger trigger */}
          <Drawer.Root
            open={mobileOpen}
            onOpenChange={(open) => setMobileOpen(open)}
            swipeDirection="right"
          >
            <Drawer.Trigger
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none"
              aria-label="Open menu"
            >
              {mobileOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </Drawer.Trigger>

            <Drawer.Portal>
              <Drawer.Backdrop className="fixed inset-0 bg-black/40 z-40" />
              <Drawer.Popup
                className={cn(
                  "fixed right-0 top-0 h-full w-72 bg-white z-50 shadow-xl flex flex-col",
                  "data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
                  "transition-transform duration-300 ease-in-out"
                )}
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-neutral-900">
                      Sparq
                    </span>
                  </div>
                  <Drawer.Close
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                    aria-label="Close menu"
                  >
                    <X className="size-5" />
                  </Drawer.Close>
                </div>

                <nav className="flex flex-col gap-1 px-4 py-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
                  {isLoggedIn ? (
                    <>
                      <Link
                        href={dashboardPath}
                        onClick={() => setMobileOpen(false)}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 px-3 h-9 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          setMobileOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="inline-flex w-full items-center justify-center rounded-lg px-3 h-9 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 px-3 h-10 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setMobileOpen(false)}
                        className="inline-flex w-full items-center justify-center rounded-full px-3 h-10 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </Drawer.Popup>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
    </header>
  );
}
