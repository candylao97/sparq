import Link from "next/link";
import { requireProvider } from "@/server/permissions";
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

const NAV_LINKS = [
  { href: "/provider", label: "Overview", icon: LayoutDashboard },
  { href: "/provider/profile", label: "Profile", icon: User },
  { href: "/provider/services", label: "Services", icon: Scissors },
  { href: "/provider/availability", label: "Availability", icon: CalendarDays },
  { href: "/provider/bookings", label: "Bookings", icon: BookOpen },
  { href: "/provider/earnings", label: "Earnings", icon: DollarSign },
  { href: "/provider/reviews", label: "Reviews", icon: Star },
  { href: "/provider/settings", label: "Settings", icon: Settings },
];

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProvider();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile: horizontal scroll tabs */}
      <nav className="lg:hidden sticky top-0 z-30 bg-background border-b border-border shadow-sm">
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="flex">
        {/* Desktop: sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-56 shrink-0 sticky top-0 h-screen border-r border-border bg-background">
          <div className="p-6 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Provider
            </p>
            <p className="text-lg font-bold mt-0.5">Dashboard</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
