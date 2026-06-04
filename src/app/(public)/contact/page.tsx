import type { Metadata } from "next";
import { Mail, Clock, MessageSquare, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | Sparq",
  description:
    "Get in touch with the Sparq team. We're here to help customers and providers with any questions or issues.",
};

const CONTACT_METHODS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@sparq.com.au",
    description: "For general enquiries and support",
    href: "mailto:hello@sparq.com.au",
  },
  {
    icon: MessageSquare,
    label: "Provider support",
    value: "providers@sparq.com.au",
    description: "For provider onboarding, payouts, and profile questions",
    href: "mailto:providers@sparq.com.au",
  },
  {
    icon: Clock,
    label: "Response time",
    value: "Within 1 business day",
    description: "We aim to respond to all enquiries quickly",
    href: null,
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Melbourne, Victoria",
    description: "Serving inner Melbourne suburbs",
    href: null,
  },
];

const BUSINESS_HOURS = [
  { day: "Monday – Friday", hours: "9:00 am – 6:00 pm AEST" },
  { day: "Saturday", hours: "10:00 am – 4:00 pm AEST" },
  { day: "Sunday", hours: "Closed" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-neutral-950 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Contact us</h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
            Whether you're a customer with a booking question or a provider needing support,
            we're here to help.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2">

          {/* Contact methods */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Get in touch</h2>
            <div className="space-y-4">
              {CONTACT_METHODS.map(({ icon: Icon, label, value, description, href }) => (
                <div
                  key={label}
                  className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                    <Icon className="size-5 text-neutral-700" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                      {label}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        className="font-semibold text-neutral-900 hover:text-neutral-600 transition-colors"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="font-semibold text-gray-900">{value}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Business hours */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="size-4 text-neutral-700" />
                <h3 className="font-semibold text-gray-900">Business hours</h3>
              </div>
              <div className="space-y-2">
                {BUSINESS_HOURS.map(({ day, hours }) => (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="text-gray-600">{day}</span>
                    <span className="font-medium text-gray-900">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form placeholder */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700" htmlFor="name">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700" htmlFor="type">
                  I am a
                </label>
                <select
                  id="type"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select…</option>
                  <option value="customer">Customer</option>
                  <option value="provider">Provider / Artist</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="How can we help you?"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>
              <p className="text-xs text-gray-400">
                This form is a placeholder. For now, please email us directly at{" "}
                <a href="mailto:hello@sparq.com.au" className="text-neutral-900 hover:underline">
                  hello@sparq.com.au
                </a>
              </p>
              <button
                type="button"
                disabled
                className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
              >
                Send message (coming soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
