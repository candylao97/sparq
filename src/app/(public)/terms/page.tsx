import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Sparq",
  description:
    "Read the Sparq Terms of Service — the rules governing your use of the Sparq platform as a customer or provider.",
};

const LAST_UPDATED = "14 March 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-neutral-900 prose-a:no-underline hover:prose-a:underline">

          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Sparq platform
            (&quot;Sparq&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operated by Sparq Pty Ltd (ABN pending), including our
            website at sparq.com.au and any related mobile or web applications
            (collectively, the &quot;Platform&quot;).
          </p>
          <p>
            By creating an account or using the Platform, you agree to be bound by these Terms. If
            you do not agree, do not use the Platform.
          </p>

          <h2>1. About the Platform</h2>
          <p>
            Sparq is an online marketplace that connects customers seeking nail and lash beauty
            services (&quot;Customers&quot;) with independent beauty professionals (&quot;Providers&quot;) located in
            Melbourne, Victoria, Australia. Sparq facilitates bookings and payments between Customers
            and Providers but is not itself a beauty service provider.
          </p>

          <h2>2. Eligibility</h2>
          <p>To use the Platform, you must:</p>
          <ul>
            <li>Be at least 18 years of age;</li>
            <li>Be located in or booking services within Australia;</li>
            <li>Have the legal capacity to enter into a binding agreement; and</li>
            <li>Not be prohibited from using our Platform under applicable law.</li>
          </ul>

          <h2>3. Accounts</h2>
          <p>
            You must create an account to access most features of the Platform. You agree to provide
            accurate, current, and complete information and to update it as needed. You are responsible
            for maintaining the security of your account credentials. You must notify us immediately if
            you suspect unauthorised access to your account.
          </p>
          <p>
            Sparq reserves the right to suspend or terminate accounts that violate these Terms or our
            Community Guidelines.
          </p>

          <h2>4. Provider Obligations</h2>
          <p>Providers using the Platform represent and warrant that they:</p>
          <ul>
            <li>Hold all necessary licences, qualifications, and registrations required by law;</li>
            <li>Carry appropriate public liability insurance;</li>
            <li>Will deliver services to a professional standard;</li>
            <li>Will accurately describe their services, availability, and pricing; and</li>
            <li>Will comply with all applicable Australian Consumer Law obligations.</li>
          </ul>
          <p>
            Providers are independent contractors. Nothing in these Terms creates an employment,
            partnership, or agency relationship between Sparq and any Provider.
          </p>

          <h2>5. Bookings and Payments</h2>
          <p>
            All bookings made through the Platform constitute a contract directly between the Customer
            and the Provider. Sparq facilitates the booking and payment process but is not a party to
            that contract.
          </p>
          <p>
            Payments are processed by Stripe. By making or receiving payments through the Platform,
            you also agree to Stripe's Terms of Service. Sparq charges a platform fee on each
            completed transaction, which is disclosed during checkout or provider onboarding.
          </p>
          <p>
            Customer payments are held in escrow until an appointment is marked complete. Providers
            must not request or accept payment by any means other than through the Platform for
            services discovered through Sparq (see Section 7 — Anti-Circumvention).
          </p>

          <h2>6. Cancellations and Refunds</h2>
          <p>
            Cancellations and refunds are governed by our{" "}
            <Link href="/cancellation-policy">Cancellation &amp; Refund Policy</Link>, which forms part
            of these Terms. Please read it carefully before making a booking.
          </p>

          <h2>7. Anti-Circumvention</h2>
          <p>
            You must not directly or indirectly arrange, solicit, or conduct transactions outside the
            Platform for services first introduced through the Platform. This includes paying or
            accepting payment via bank transfer, cash, or third-party payment apps in lieu of the
            Sparq checkout.
          </p>
          <p>
            Violations of this policy may result in immediate account suspension and, in some cases,
            a financial penalty equal to the service fee that would have been payable.
          </p>

          <h2>8. Reviews</h2>
          <p>
            Customers may leave reviews following completed bookings. Reviews must be honest,
            accurate, and not contain defamatory, offensive, or misleading content. Sparq reserves the
            right to remove reviews that violate our guidelines. Providers may respond to reviews
            publicly but may not offer incentives for removal or modification of reviews.
          </p>

          <h2>9. Prohibited Conduct</h2>
          <p>You must not use the Platform to:</p>
          <ul>
            <li>Violate any applicable law or regulation;</li>
            <li>Harass, abuse, or threaten other users;</li>
            <li>Post false, misleading, or fraudulent information;</li>
            <li>Interfere with the security or operation of the Platform;</li>
            <li>Use automated tools to scrape or access the Platform without permission; or</li>
            <li>Engage in any activity that damages the reputation of Sparq or other users.</li>
          </ul>

          <h2>10. Intellectual Property</h2>
          <p>
            All content on the Platform — including text, graphics, logos, and software — is owned by
            or licensed to Sparq and is protected by Australian intellectual property law. You may not
            reproduce, distribute, or create derivative works without our prior written consent.
          </p>
          <p>
            By uploading content (e.g. portfolio photos, profile descriptions) to the Platform, you
            grant Sparq a non-exclusive, royalty-free, worldwide licence to use, display, and promote
            that content in connection with the Platform.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Sparq's total liability to you for any claim
            arising out of or in connection with the Platform is limited to the amount paid by you
            (or to you) through the Platform in the 12 months preceding the claim.
          </p>
          <p>
            Sparq is not liable for any indirect, incidental, special, or consequential loss,
            including loss of revenue, data, or reputation.
          </p>
          <p>
            Nothing in these Terms excludes or limits any guarantee, condition, or warranty implied by
            the Australian Consumer Law that cannot be excluded or limited.
          </p>

          <h2>12. Dispute Resolution</h2>
          <p>
            We encourage users to resolve disputes informally by contacting our support team in the
            first instance. If a dispute cannot be resolved informally, you agree to attempt mediation
            in good faith before commencing litigation.
          </p>
          <p>
            These Terms are governed by the laws of Victoria, Australia. The courts of Victoria have
            non-exclusive jurisdiction.
          </p>

          <h2>13. Changes to These Terms</h2>
          <p>
            Sparq may update these Terms from time to time. We will provide reasonable notice of
            material changes by email or by displaying a notice on the Platform. Continued use of the
            Platform after the effective date of changes constitutes acceptance of the updated Terms.
          </p>

          <h2>14. Contact</h2>
          <p>
            If you have questions about these Terms, please contact us at{" "}
            <a href="mailto:legal@sparq.com.au">legal@sparq.com.au</a> or through our{" "}
            <Link href="/contact">Contact page</Link>.
          </p>
        </div>

        {/* Related links */}
        <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap gap-4">
          <Link href="/privacy" className="text-neutral-900 hover:text-neutral-600 text-sm font-medium">
            Privacy Policy →
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
