import Link from "next/link";
import { Sparkles } from "lucide-react";

const footerLinks = {
  Services: [
    { label: "Nails", href: "/services#nails" },
    { label: "Lashes", href: "/services#lashes" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Trust & Safety", href: "/trust-and-safety" },
    { label: "FAQ", href: "/faq" },
  ],
  Legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Cancellation Policy", href: "/cancellation-policy" },
    { label: "Contact", href: "/contact" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-1.5 w-fit">
              <Sparkles className="size-5 text-indigo-600" />
              <span className="text-xl font-bold tracking-tight text-neutral-900">
                Sparq
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              Melbourne&apos;s marketplace for talented nail and lash artists.
              Book your next appointment with confidence.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {category}
              </h3>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} Sparq. All rights reserved.
          </p>
          <p className="text-sm text-gray-400">
            Made with love in Melbourne, Australia 🇦🇺
          </p>
        </div>
      </div>
    </footer>
  );
}
