export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e1de] pt-16 pb-12 md:pt-24 md:pb-14">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#717171] mb-4">
            Legal
          </p>
          <h1 className="font-headline text-[2.5rem] md:text-[3rem] text-[#1A1A1A] leading-[1.1] mb-4">
            Privacy policy
          </h1>
          <p className="text-sm text-[#717171]">
            Last updated: March 2026
          </p>
        </div>
      </section>

      {/* ─── Content ──────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20 space-y-12">

          {/* Intro */}
          <p className="text-base text-[#717171] leading-relaxed">
            Sparq Pty Ltd (&quot;Sparq&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our platform at sparq.com.au.
          </p>

          {/* Section 1 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              1. Information we collect
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                We collect information you provide directly, such as your name, email address, phone number, and profile details when you create an account or make a booking.
              </p>
              <p>
                We also collect information automatically when you use Sparq, including your IP address, browser type, pages visited, and actions taken on the platform. This helps us improve our services and detect fraud.
              </p>
              <p>
                If you connect a payment method, payment processing is handled entirely by Stripe. Sparq does not store your card details.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 2 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              2. How we use your information
            </h2>
            <div className="space-y-3 text-sm text-[#717171] leading-relaxed">
              <p>We use your information to:</p>
              <ul className="space-y-2 pl-4">
                {[
                  'Create and manage your Sparq account',
                  'Facilitate bookings between clients and artists',
                  'Process payments and send receipts',
                  'Send you booking confirmations, reminders, and updates',
                  'Improve platform safety and detect fraudulent activity',
                  'Respond to your support requests',
                  'Send you relevant product updates (you can opt out at any time)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#E96B56] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 3 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              3. Sharing your information
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                We do not sell your personal information to third parties. We share data only in the following circumstances:
              </p>
              <ul className="space-y-2 pl-4">
                {[
                  'With artists or clients as required to fulfil a booking you have made',
                  'With Stripe for secure payment processing',
                  'With trusted service providers (email, analytics, cloud hosting) who are contractually bound to protect your data',
                  'When required by law or to protect the rights and safety of our users',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#E96B56] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 4 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              4. Security
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                We take security seriously. All data is transmitted over HTTPS, passwords are hashed using industry-standard algorithms, and access to production data is strictly limited to authorised team members.
              </p>
              <p>
                While we implement robust security measures, no online platform can guarantee 100% security. We encourage you to use a strong, unique password for your Sparq account.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 5 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              5. Your rights
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                Under Australian Privacy Law (Privacy Act 1988), you have the right to access, correct, or delete your personal information. To exercise any of these rights, contact us at the address below.
              </p>
              <p>
                You may also opt out of marketing communications at any time by clicking &quot;Unsubscribe&quot; in any email we send.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 6 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              6. Contact
            </h2>
            <div className="space-y-3 text-sm text-[#717171] leading-relaxed">
              <p>
                If you have questions about this Privacy Policy or how we handle your data, please contact us:
              </p>
              <p>
                <span className="font-medium text-[#1A1A1A]">Sparq Pty Ltd</span><br />
                Sydney, New South Wales, Australia<br />
                <a
                  href="mailto:privacy@sparq.com.au"
                  className="font-medium text-[#E96B56] hover:underline underline-offset-2 transition-colors"
                >
                  privacy@sparq.com.au
                </a>
              </p>
            </div>
          </div>

        </div>
      </section>

    </main>
  )
}
