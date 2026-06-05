import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/permissions";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  CalendarDays,
  Star,
  Settings,
  ShieldAlert,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/providers", label: "Provider Approvals", icon: UserCheck },
  { href: "/admin/providers?tab=all", label: "Providers", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red-600">
            <ShieldAlert className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Sparq Admin</p>
            <p className="text-xs text-gray-400 mt-0.5">Control Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={`${href}-${label}`}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group"
            >
              <Icon className="size-4 text-gray-500 group-hover:text-red-400 transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-600">Admin access only</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-950">
        <div className="min-h-full p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
