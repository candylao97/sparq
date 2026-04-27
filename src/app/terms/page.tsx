export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e1de] pt-16 pb-12 md:pt-24 md:pb-14">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-8 lg:px-12 xl:px-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#717171] mb-4">
            Legal
          </p>
          <h1 className="font-headline text-[2.5rem] md:text-[3rem] text-[#1A1A1A] leading-[1.1] mb-4">
            Terms of service
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
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Sparq platform operated by Sparq Pty Ltd (&quot;Sparq&quot;, &quot;we&quot;, &quot;our&quot;). By creating an account or using Sparq, you agree to these Terms.
          </p>

          {/* Section 1 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              1. Acceptance of terms
            </h2>
            <p className="text-sm text-[#717171] leading-relaxed">
              By accessing or using Sparq, you confirm that you are at least 18 years old, have read and understood these Terms, and agree to be bound by them. If you do not agree, please do not use our platform.
            </p>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 2 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              2. Services
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                Sparq is a marketplace that connects independent beauty and lifestyle artists (&quot;Artists&quot;) with clients (&quot;Clients&quot;). Sparq facilitates bookings and payments but is not a party to the service agreement between Artists and Clients.
              </p>
              <p>
                We reserve the right to modify, suspend, or discontinue any part of the platform at any time with reasonable notice.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 3 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              3. User accounts
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                You are responsible for maintaining the security of your account and for all activity that occurs under it. You must provide accurate and complete information when registering and keep your details up to date.
              </p>
              <p>
                You may not share your account, use another person&apos;s account, or create multiple accounts for the purpose of circumventing our policies.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 4 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              4. Bookings &amp; payments
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                When a Client books an Artist through Sparq, a temporary payment hold is placed. The payment is only captured after the appointment is confirmed complete. Sparq charges a booking fee on each transaction to support platform operations.
              </p>
              <p>
                Artists receive their earnings 2–3 business days after a booking is marked complete, less the applicable platform fee. All payments are processed through Stripe.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 5 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              5. Cancellations &amp; refunds
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                Clients may cancel a booking at no cost up to 24 hours before the scheduled appointment. Cancellations made within 24 hours may be subject to a cancellation fee as set by the Artist.
              </p>
              <p>
                If an Artist cancels or fails to attend a confirmed booking, the Client will receive a full refund. Repeated cancellations by Artists may result in account suspension.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 6 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              6. Prohibited conduct
            </h2>
            <div className="space-y-3 text-sm text-[#717171] leading-relaxed">
              <p>You agree not to:</p>
              <ul className="space-y-2 pl-4">
                {[
                  'Use the platform for any unlawful purpose',
                  'Post false, misleading, or fraudulent reviews',
                  'Solicit bookings outside the Sparq platform to avoid fees',
                  'Harass, threaten, or discriminate against other users',
                  'Attempt to access, modify, or disrupt our systems',
                  'Create fake accounts or impersonate another person',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#E96B56] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="pt-1">
                Violations may result in immediate account suspension or termination.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 7 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              7. Limitation of liability
            </h2>
            <div className="space-y-4 text-sm text-[#717171] leading-relaxed">
              <p>
                To the fullest extent permitted by Australian law, Sparq is not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including loss of earnings or data.
              </p>
              <p>
                Sparq&apos;s total liability to you for any claim shall not exceed the total booking fees you have paid to Sparq in the 12 months preceding the claim.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e8e1de]" />

          {/* Section 8 */}
          <div>
            <h2 className="font-headline text-2xl text-[#1A1A1A] mb-4">
              8. Contact
            </h2>
            <div className="space-y-3 text-sm text-[#717171] leading-relaxed">
              <p>
                Questions about these Terms? Reach out to us:
              </p>
              <p>
                <span className="font-medium text-[#1A1A1A]">Sparq Pty Ltd</span><br />
                Sydney, New South Wales, Australia<br />
                <a
                  href="mailto:legal@sparq.com.au"
                  className="font-medium text-[#E96B56] hover:underline underline-offset-2 transition-colors"
                >
                  legal@sparq.com.au
                </a>
              </p>
            </div>
          </div>

        </div>
      </section>

    </main>
  )
}
