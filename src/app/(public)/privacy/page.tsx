import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Sparq",
  description:
    "Read the Sparq Privacy Policy to understand how we collect, use, and protect your personal information.",
};

const LAST_UPDATED = "14 March 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-neutral-900 prose-a:no-underline hover:prose-a:underline">

          <p>
            Sparq Pty Ltd (&quot;Sparq&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your
            personal information. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your data when you use the Sparq platform at sparq.com.au
            (&quot;Platform&quot;).
          </p>
          <p>
            We comply with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles
            (APPs). By using the Platform, you consent to the collection and use of your information
            as described in this Policy.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>Information you provide directly</h3>
          <ul>
            <li><strong>Account information:</strong> name, email address, password (hashed), phone number, and date of birth.</li>
            <li><strong>Provider information:</strong> business name, ABN, service descriptions, pricing, portfolio photos, and identity verification documents.</li>
            <li><strong>Payment information:</strong> billing details collected and stored by Stripe. Sparq does not store full card numbers.</li>
            <li><strong>Communications:</strong> messages you send to our support team, reviews you post, and any other content you submit.</li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li><strong>Usage data:</strong> pages visited, search queries, booking history, and device/browser type.</li>
            <li><strong>Log data:</strong> IP address, timestamps, and referral URLs.</li>
            <li><strong>Cookies:</strong> session cookies to keep you logged in, and analytics cookies (see Section 6).</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Operate and improve the Platform;</li>
            <li>Process bookings and payments;</li>
            <li>Verify provider identities and qualifications;</li>
            <li>Send transactional emails (booking confirmations, reminders, receipts);</li>
            <li>Respond to support enquiries and resolve disputes;</li>
            <li>Detect and prevent fraud, abuse, and violations of our Terms;</li>
            <li>Send marketing communications (you may opt out at any time); and</li>
            <li>Comply with our legal obligations.</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>We do not sell your personal information. We share it only in the following circumstances:</p>
          <ul>
            <li>
              <strong>Between Customers and Providers:</strong> When a booking is made, your name and contact details are shared with the relevant Provider (and vice versa) to facilitate the appointment.
            </li>
            <li>
              <strong>Service providers:</strong> We share data with trusted third-party vendors including Stripe (payments), Resend (email delivery), and Cloudinary (image hosting). These parties process data only on our behalf and under strict data processing agreements.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose your information if required by law, court order, or to protect the rights and safety of Sparq or others.
            </li>
            <li>
              <strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred. We will notify you before this occurs.
            </li>
          </ul>

          <h2>4. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to
            provide our services. If you close your account, we will delete or anonymise your personal
            data within 90 days, except where we are required to retain it for legal, tax, or
            regulatory purposes (typically up to 7 years for financial records).
          </p>

          <h2>5. Security</h2>
          <p>
            We implement industry-standard security measures including HTTPS encryption, hashed
            passwords (bcrypt), and access controls. Payment data is handled by Stripe, which is
            PCI-DSS Level 1 certified. No system is completely secure; we cannot guarantee absolute
            security. In the event of a data breach, we will notify affected users as required by law.
          </p>

          <h2>6. Cookies</h2>
          <p>We use the following types of cookies:</p>
          <ul>
            <li><strong>Essential cookies:</strong> Required for authentication and core Platform functionality. Cannot be disabled.</li>
            <li><strong>Analytics cookies:</strong> Help us understand how users interact with the Platform (e.g. page views, session duration). You can opt out via your browser settings.</li>
          </ul>
          <p>
            You can control cookie settings through your browser. Disabling essential cookies may
            impact your ability to use the Platform.
          </p>

          <h2>7. Your Rights</h2>
          <p>Under the Australian Privacy Act and APPs, you have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you;</li>
            <li>Request correction of inaccurate data;</li>
            <li>Request deletion of your data (subject to our legal retention obligations);</li>
            <li>Opt out of marketing communications at any time; and</li>
            <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) if you believe we have mishandled your data.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:privacy@sparq.com.au">privacy@sparq.com.au</a>.
          </p>

          <h2>8. Children</h2>
          <p>
            The Platform is not directed at children under 18. We do not knowingly collect personal
            information from minors. If we become aware that we have inadvertently collected data from
            a child, we will delete it promptly.
          </p>

          <h2>9. Third-Party Links</h2>
          <p>
            The Platform may contain links to third-party websites. We are not responsible for the
            privacy practices of those sites and encourage you to review their privacy policies.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by email or by posting a notice on the Platform. Continued use after the effective
            date constitutes acceptance of the updated Policy.
          </p>

          <h2>11. Contact</h2>
          <p>
            For privacy-related questions or requests, contact our Privacy Officer at{" "}
            <a href="mailto:privacy@sparq.com.au">privacy@sparq.com.au</a> or through our{" "}
            <Link href="/contact">Contact page</Link>.
          </p>
          <p>
            You may also contact the Office of the Australian Information Commissioner (OAIC) at{" "}
            <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">
              oaic.gov.au
            </a>{" "}
            if you have a complaint that we have not satisfactorily resolved.
          </p>
        </div>

        {/* Related links */}
        <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap gap-4">
          <Link href="/terms" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Terms of Service →
          </Link>
          <Link href="/cancellation-policy" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Cancellation Policy →
          </Link>
          <Link href="/trust-and-safety" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Trust &amp; Safety →
          </Link>
        </div>
      </div>
    </div>
  );
}
