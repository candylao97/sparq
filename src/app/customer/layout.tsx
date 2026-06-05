import { requireCustomer } from "@/server/permissions";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  Star,
  Settings,
} from "lucide-react";
import { AccountMenu } from "@/components/customer/account-menu";

const navLinks = [
  { href: "/customer", label: "Account", icon: LayoutDashboard },
  { href: "/customer/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/customer/payments", label: "Payments & receipts", icon: CreditCard },
  { href: "/customer/reviews", label: "Reviews", icon: Star },
  { href: "/customer/settings", label: "Settings", icon: Settings },
];

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomer();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard top bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-sm font-semibold text-neutral-900">
            My Account
          </span>
          <AccountMenu
            name={session.user.name}
            email={session.user.email}
            image={session.user.image}
          />
        </div>
      </div>

      {/* Mobile horizontal tabs */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex overflow-x-auto scrollbar-hide">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex flex-col w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sticky top-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">
                My Account
              </p>
              <nav className="space-y-0.5">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
