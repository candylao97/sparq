/**
 * Sparq Email Service
 *
 * Uses Resend (https://resend.com) when RESEND_API_KEY is set.
 * Falls back to console logging in development.
 *
 * To activate:
 *   1. Sign up at resend.com and get an API key
 *   2. Add RESEND_API_KEY=re_xxx to your .env.local
 *   3. Set RESEND_FROM_EMAIL=noreply@yourdomain.com
 *
 * FIND-6 compliance:
 *   - Every send runs through `sendEmail` which (a) checks the
 *     Suppression table and aborts for non-transactional sends to
 *     suppressed addresses, and (b) appends the unsubscribe footer +
 *     List-Unsubscribe / List-Unsubscribe-Post headers.
 *   - Each exported `send*` helper declares its category —
 *     'transactional' bypasses the suppression check per s.5 Spam
 *     Act carve-outs; 'marketing' is subject to it.
 */
import { prisma } from './prisma'
import { unsubscribeToken, isTransactional, type EmailCategory } from './unsubscribe'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Sparq <noreply@sparq.com.au>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface EmailPayload {
  to: string
  subject: string
  html: string
  /** FIND-6: required. Drives the suppression check + footer inclusion. */
  category: EmailCategory
}

function unsubscribeFooterHtml(email: string): string {
  const token = unsubscribeToken(email)
  const url = `${APP_URL}/api/unsubscribe?token=${token}`
  return `
    <div style="border-top:1px solid #e8e1de;margin-top:32px;padding-top:16px;font-size:11px;color:#999;text-align:center;font-family:system-ui,-apple-system,sans-serif;">
      <p style="margin:0 0 8px;">You're receiving this because your Sparq account is set to receive updates at ${email}.</p>
      <p style="margin:0;"><a href="${url}" style="color:#717171;text-decoration:underline;">Unsubscribe from Sparq emails</a></p>
    </div>
  `.trim()
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const normalized = payload.to.trim().toLowerCase()

  // FIND-6: suppression check. Transactional categories bypass the list per
  // Spam Act s.5 (account/service updates aren't "commercial electronic
  // messages"). Marketing emails must skip if the address is suppressed.
  if (!isTransactional(payload.category)) {
    const suppressed = await prisma.suppression.findUnique({
      where: { email: normalized },
      select: { email: true },
    }).catch(() => null)
    if (suppressed) {
      console.info(`[EMAIL] Skipping ${payload.category} send to suppressed address: ${normalized}`)
      return
    }
  }

  // Append the unsubscribe footer to every outgoing email, including
  // transactional ones — legal best-practice is to make it always findable
  // even on transactional mail, so users never feel trapped. The Spam Act
  // only requires it on marketing, but showing it on all is always safe.
  const htmlWithFooter = `${payload.html}\n${unsubscribeFooterHtml(normalized)}`

  // RFC 8058 headers — Gmail/Outlook/Apple Mail render a native
  // "Unsubscribe" button that fires a one-click POST against the URL below.
  const token = unsubscribeToken(normalized)
  const unsubUrl = `${APP_URL}/api/unsubscribe?token=${token}`
  const unsubHeader = `<${unsubUrl}>`
  const listUnsubPost = 'List-Unsubscribe=One-Click'

  if (!RESEND_API_KEY) {
    // Dev fallback — log to console
    console.log(`[EMAIL] To: ${normalized}  (category=${payload.category})`)
    console.log(`[EMAIL] Subject: ${payload.subject}`)
    console.log(`[EMAIL] List-Unsubscribe: ${unsubHeader}`)
    console.log(`[EMAIL] Body preview: ${htmlWithFooter.replace(/<[^>]+>/g, '').slice(0, 200)}`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: normalized,
      subject: payload.subject,
      html: htmlWithFooter,
      headers: {
        'List-Unsubscribe': unsubHeader,
        'List-Unsubscribe-Post': listUnsubPost,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[EMAIL] Resend error ${res.status}: ${body}`)
    throw new Error(`Email send failed: ${res.status}`)
  }
}

// ── Transactional Email Templates ─────────────────────────────────

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  await sendEmail({
    to: email,
    subject: 'Verify your Sparq account',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:24px;color:#1A1A1A;margin-bottom:8px;">Welcome to Sparq ✨</h1>
        <p style="color:#717171;margin-bottom:24px;">Click the button below to verify your email address and activate your account.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;">Verify email</a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">This link expires in 24 hours. If you didn't create a Sparq account, you can ignore this email.</p>
      </div>
    `,
    category: 'transactional' as const,
  })
}

export async function sendBookingConfirmationEmail(
  customerEmail: string,
  opts: {
    customerName: string
    serviceTitle: string
    providerName: string
    bookingDate: string
    bookingTime: string
    totalPrice: number
    bookingId: string
  }
): Promise<void> {
  await sendEmail({
    to: customerEmail,
    subject: `Booking confirmed — ${opts.serviceTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Your booking is confirmed 🎉</h1>
        <p style="color:#717171;">Hi ${opts.customerName},</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="color:#717171;padding:6px 0;">Service</td><td style="font-weight:600;color:#1A1A1A;">${opts.serviceTitle}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Artist</td><td style="font-weight:600;color:#1A1A1A;">${opts.providerName}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Date</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingDate}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Time</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingTime}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Total</td><td style="font-weight:600;color:#1A1A1A;">A$${opts.totalPrice.toFixed(2)}</td></tr>
        </table>
        <a href="${APP_URL}/dashboard/customer" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">View booking</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Free cancellation up to 24 hours before your appointment.</p>
      </div>
    `,
    category: 'transactional' as const,
  })
}

export async function sendBookingRequestEmail(
  providerEmail: string,
  opts: {
    providerName: string
    customerName: string
    serviceTitle: string
    bookingDate: string
    bookingTime: string
    bookingId: string
  }
): Promise<void> {
  await sendEmail({
    to: providerEmail,
    subject: `New booking request — ${opts.serviceTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">New booking request 📅</h1>
        <p style="color:#717171;">Hi ${opts.providerName}, ${opts.customerName} wants to book a session.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="color:#717171;padding:6px 0;">Service</td><td style="font-weight:600;color:#1A1A1A;">${opts.serviceTitle}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Client</td><td style="font-weight:600;color:#1A1A1A;">${opts.customerName}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Date</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingDate}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Time</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingTime}</td></tr>
        </table>
        <a href="${APP_URL}/dashboard/provider" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">Accept or decline</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">You have 24 hours to accept before the request expires.</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendBookingConfirmationToCustomer(
  to: string,
  opts: {
    customerName: string
    serviceTitle: string
    providerName: string
    bookingDate: string
    bookingTime: string
    bookingId: string
  }
): Promise<void> {
  const bookingUrl = `${APP_URL}/bookings/${opts.bookingId}/confirmed`
  await sendEmail({
    to,
    subject: `Booking request sent — ${opts.serviceTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Booking request sent!</h1>
        <p style="color:#717171;">Hi ${opts.customerName}, your booking request has been sent! ${opts.providerName} has 24 hours to accept.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="color:#717171;padding:6px 0;">Service</td><td style="font-weight:600;color:#1A1A1A;">${opts.serviceTitle}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Artist</td><td style="font-weight:600;color:#1A1A1A;">${opts.providerName}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Date</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingDate}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Time</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingTime}</td></tr>
        </table>
        <a href="${bookingUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">View booking</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Your card won't be charged until your artist confirms.</p>
      </div>
    `,
    category: 'transactional' as const,
  })
}

export async function sendPayoutEmail(
  providerEmail: string,
  opts: {
    providerName: string
    amount: number
    serviceTitle: string
  }
): Promise<void> {
  await sendEmail({
    to: providerEmail,
    subject: `Payout sent — A$${opts.amount.toFixed(2)}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Your payout is on the way 💸</h1>
        <p style="color:#717171;">Hi ${opts.providerName}, your payout for <strong>${opts.serviceTitle}</strong> has been sent.</p>
        <p style="font-size:32px;font-weight:700;color:#1A1A1A;margin:20px 0;">A$${opts.amount.toFixed(2)}</p>
        <a href="${APP_URL}/dashboard/provider" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">View dashboard</a>
      </div>
    `,
    category: 'transactional' as const,
  })
}

export async function sendBookingReminderEmail(
  to: string,
  opts: {
    name: string
    serviceTitle: string
    providerName: string
    bookingDate: string
    bookingTime: string
    locationType: string
    address?: string | null
    bookingId: string
  }
): Promise<void> {
  const locationLine = opts.locationType === 'AT_HOME' && opts.address
    ? `<tr><td style="color:#717171;padding:6px 0;">Location</td><td style="font-weight:600;color:#1A1A1A;">${opts.address}</td></tr>`
    : opts.locationType === 'STUDIO'
    ? `<tr><td style="color:#717171;padding:6px 0;">Location</td><td style="font-weight:600;color:#1A1A1A;">Artist's studio${opts.address ? ` – ${opts.address}` : ''}</td></tr>`
    : ''

  await sendEmail({
    to,
    subject: `Reminder: your ${opts.serviceTitle} appointment is tomorrow`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Your appointment is coming up 📅</h1>
        <p style="color:#717171;">Hi ${opts.name}, just a reminder about your booking tomorrow.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="color:#717171;padding:6px 0;">Service</td><td style="font-weight:600;color:#1A1A1A;">${opts.serviceTitle}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Artist</td><td style="font-weight:600;color:#1A1A1A;">${opts.providerName}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Date</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingDate}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Time</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingTime}</td></tr>
          ${locationLine}
        </table>
        <a href="${APP_URL}/dashboard/customer" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">View booking details</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Need to cancel? You can cancel up to 24 hours before your appointment for a full refund.</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendPaymentExpiryWarningEmail(
  to: string,
  opts: { name: string; serviceTitle: string; bookingId: string }
): Promise<void> {
  const APP_URL = process.env.NEXTAUTH_URL ?? 'https://sparq.com.au'
  await sendEmail({
    to,
    subject: `Action needed: your Sparq booking payment is about to expire`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Your payment hold is expiring soon ⚠️</h1>
        <p style="color:#717171;">Hi ${opts.name}, the payment hold for your <strong>${opts.serviceTitle}</strong> booking will expire in about 48 hours.</p>
        <p style="color:#717171;">If the appointment is still confirmed, no action is needed. If you'd like to rebook, please cancel and create a new booking.</p>
        <a href="${APP_URL}/bookings" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">View booking</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Questions? Contact us at support@sparq.com.au</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendPaymentFailedEmail(
  to: string,
  opts: { name: string; serviceTitle: string; providerName: string; bookingId: string; retryUrl: string }
): Promise<void> {
  await sendEmail({
    to,
    subject: `Action required: payment failed for your ${opts.serviceTitle} booking`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Payment failed ⚠️</h1>
        <p style="color:#717171;">Hi ${opts.name}, we couldn't process your payment for <strong>${opts.serviceTitle}</strong> with ${opts.providerName}.</p>
        <p style="color:#717171;">Your booking is on hold — please update your payment method to keep the appointment.</p>
        <a href="${opts.retryUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin:16px 0;">Retry payment</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">If you need help, contact us at support@sparq.com.au</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendRefundConfirmationEmail(
  to: string,
  opts: { name: string; serviceTitle: string; amount: number; reason?: string }
): Promise<void> {
  await sendEmail({
    to,
    subject: `Refund confirmed — ${opts.serviceTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Your refund is on the way 💰</h1>
        <p style="color:#717171;">Hi ${opts.name}, a refund of <strong>A$${opts.amount.toFixed(2)}</strong> for <strong>${opts.serviceTitle}</strong> has been processed.</p>
        ${opts.reason ? `<p style="color:#717171;">Reason: ${opts.reason}</p>` : ''}
        <p style="color:#717171;">Refunds typically appear within 5–10 business days, depending on your bank.</p>
        <a href="${APP_URL}/bookings" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">View my bookings</a>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendWaitlistNotificationEmail(
  to: string,
  opts: { name: string; providerName: string; serviceTitle: string; date: string; bookUrl: string }
): Promise<void> {
  await sendEmail({
    to,
    subject: `A spot opened up — ${opts.serviceTitle} is available`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">A spot just opened up! 🎉</h1>
        <p style="color:#717171;">Hi ${opts.name}, good news — a slot for <strong>${opts.serviceTitle}</strong> with ${opts.providerName} on <strong>${opts.date}</strong> is now available.</p>
        <p style="color:#717171;">Book quickly before it's taken:</p>
        <a href="${opts.bookUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin:16px 0;">Book now</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">You received this because you joined the waitlist on Sparq. Manage your preferences at ${APP_URL}/dashboard/customer</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendBookingCancelledEmail(
  providerEmail: string,
  opts: {
    providerName: string
    customerName: string
    serviceTitle: string
    bookingDate: string
    bookingTime: string
    bookingId: string
  }
): Promise<void> {
  await sendEmail({
    to: providerEmail,
    subject: `Booking cancelled — ${opts.serviceTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Booking cancelled by client</h1>
        <p style="color:#717171;">Hi ${opts.providerName}, ${opts.customerName} has cancelled their booking.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="color:#717171;padding:6px 0;">Service</td><td style="font-weight:600;color:#1A1A1A;">${opts.serviceTitle}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Client</td><td style="font-weight:600;color:#1A1A1A;">${opts.customerName}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Date</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingDate}</td></tr>
          <tr><td style="color:#717171;padding:6px 0;">Time</td><td style="font-weight:600;color:#1A1A1A;">${opts.bookingTime}</td></tr>
        </table>
        <p style="color:#717171;">The slot is now free — your availability has been updated automatically.</p>
        <a href="${APP_URL}/dashboard/provider" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">View dashboard</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Questions? Contact us at support@sparq.com.au</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendBookingDeclinedEmail(
  to: string,
  opts: { name: string; serviceTitle: string; providerName: string; bookingId: string }
): Promise<void> {
  await sendEmail({
    to,
    subject: `Booking declined — ${opts.serviceTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Your booking request was declined</h1>
        <p style="color:#717171;">Hi ${opts.name}, unfortunately ${opts.providerName} wasn't able to accept your booking for <strong>${opts.serviceTitle}</strong>.</p>
        <p style="color:#717171;">Your card hold has been released — no charge was made.</p>
        <a href="${APP_URL}/search" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">Find another artist</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Questions? Contact us at support@sparq.com.au</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendReviewReminderEmail(
  to: string,
  opts: { name: string; serviceTitle: string; providerName: string; bookingId: string }
): Promise<void> {
  await sendEmail({
    to,
    subject: `How did it go? Leave a review for ${opts.providerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">How was your experience? ⭐</h1>
        <p style="color:#717171;">Hi ${opts.name}, we hope your <strong>${opts.serviceTitle}</strong> appointment with ${opts.providerName} went well!</p>
        <p style="color:#717171;">Your honest review helps other clients find great artists on Sparq.</p>
        <a href="${APP_URL}/bookings" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin:16px 0;">Leave a review</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Reviews can be submitted within 30 days of your appointment.</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Reset your Sparq password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Reset your password</h1>
        <p style="color:#717171;">We received a request to reset your Sparq password. Click below to choose a new one.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin:16px 0;">Reset password</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    category: 'transactional' as const,
  })
}

export async function sendDisputeOpenedEmail(
  to: string,
  name: string,
  bookingId: string,
  reason: string
): Promise<void> {
  const bookingUrl = `${APP_URL}/bookings/${bookingId}`
  await sendEmail({
    to,
    subject: 'A dispute has been opened on your booking',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">A dispute has been opened</h1>
        <p style="color:#717171;">Hi ${name}, a dispute has been raised on one of your bookings.</p>
        <div style="background:#f9f2ef;border-radius:10px;padding:16px 20px;margin:20px 0;">
          <p style="color:#717171;margin:0 0 4px 0;font-size:13px;">Reason provided</p>
          <p style="color:#1A1A1A;margin:0;font-weight:500;">${reason}</p>
        </div>
        <p style="color:#717171;">The Sparq team will review this dispute and be in touch within 3 business days. No action is needed from you right now.</p>
        <a href="${bookingUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">View booking</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Questions? Contact us at support@sparq.com.au</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendKycDecisionEmail(
  to: string,
  name: string,
  decision: 'VERIFIED' | 'REJECTED',
  rejectionReason?: string
): Promise<void> {
  if (decision === 'VERIFIED') {
    await sendEmail({
      to,
      subject: "You're verified on Sparq! 🎉",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
          <h1 style="font-size:22px;color:#1A1A1A;">You're verified! 🎉</h1>
          <p style="color:#717171;">Hi ${name}, congratulations — your identity has been successfully verified on Sparq.</p>
          <p style="color:#717171;">You can now receive bookings and payouts. Clients will see your verified badge on your profile, building trust from the very first visit.</p>
          <a href="${APP_URL}/dashboard/provider" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">Go to my dashboard</a>
          <p style="color:#aaa;font-size:12px;margin-top:24px;">Thank you for helping keep Sparq a trusted community.</p>
        </div>
      `,
      category: 'marketing' as const,
    })
  } else {
    await sendEmail({
      to,
      subject: 'Action required: identity verification',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
          <h1 style="font-size:22px;color:#1A1A1A;">Verification unsuccessful</h1>
          <p style="color:#717171;">Hi ${name}, we weren't able to complete your identity verification this time.</p>
          ${rejectionReason ? `
          <div style="background:#f9f2ef;border-radius:10px;padding:16px 20px;margin:20px 0;">
            <p style="color:#717171;margin:0 0 4px 0;font-size:13px;">Reason</p>
            <p style="color:#1A1A1A;margin:0;font-weight:500;">${rejectionReason}</p>
          </div>` : ''}
          <p style="color:#717171;">Please review the details and re-submit your documents via your dashboard. Our team is here to help if you have any questions.</p>
          <a href="${APP_URL}/dashboard/provider/kyc" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">Re-submit verification</a>
          <p style="color:#aaa;font-size:12px;margin-top:24px;">Need help? Contact us at support@sparq.com.au</p>
        </div>
      `,
      category: 'marketing' as const,
    })
  }
}

export async function sendReviewReplyEmail(
  to: string,
  customerName: string,
  artistName: string,
  reviewText: string,
  replyText: string,
  providerProfileUrl: string
): Promise<void> {
  await sendEmail({
    to,
    subject: `${artistName} replied to your review on Sparq`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Your review got a reply ✨</h1>
        <p style="color:#717171;">Hi ${customerName}, ${artistName} has responded to your review on Sparq.</p>
        ${reviewText ? `
        <div style="background:#f9f2ef;border-left:3px solid #e8e1de;border-radius:0 10px 10px 0;padding:14px 16px;margin:20px 0;">
          <p style="color:#717171;font-size:12px;margin:0 0 6px 0;font-style:italic;">Your review</p>
          <p style="color:#1A1A1A;margin:0;font-size:14px;">${reviewText}</p>
        </div>` : ''}
        <div style="background:#f3ece9;border-radius:10px;padding:14px 16px;margin:0 0 24px 0;">
          <p style="color:#717171;font-size:12px;margin:0 0 6px 0;">Response from ${artistName}</p>
          <p style="color:#1A1A1A;margin:0;font-size:14px;">${replyText}</p>
        </div>
        <a href="${providerProfileUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">View on Sparq</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Thank you for being part of the Sparq community.</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendNewMessageEmail(
  to: string,
  recipientName: string,
  senderName: string,
  messagePreview: string,
  conversationUrl: string
): Promise<void> {
  const fullUrl = conversationUrl.startsWith('http') ? conversationUrl : `${APP_URL}${conversationUrl}`
  await sendEmail({
    to,
    subject: `New message from ${senderName} on Sparq`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">You have a new message</h1>
        <p style="color:#717171;">Hi ${recipientName}, you have a new message from <strong>${senderName}</strong> on Sparq.</p>
        <div style="background:#f9f2ef;border-left:3px solid #E96B56;border-radius:0 10px 10px 0;padding:14px 16px;margin:20px 0;">
          <p style="color:#717171;font-size:12px;margin:0 0 6px 0;font-style:italic;">${senderName} wrote</p>
          <p style="color:#1A1A1A;margin:0;font-size:14px;line-height:1.5;">${messagePreview}</p>
        </div>
        <a href="${fullUrl}" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">Reply on Sparq</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">You can manage your notification preferences in your Sparq account settings.</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}

export async function sendBookingExpiredEmail(
  to: string,
  customerName: string,
  providerName: string,
  serviceTitle: string
): Promise<void> {
  await sendEmail({
    to,
    subject: 'Your booking request expired',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;">
        <h1 style="font-size:22px;color:#1A1A1A;">Booking request expired</h1>
        <p style="color:#717171;">Hi ${customerName}, your booking request for <strong>${serviceTitle}</strong> with ${providerName} has expired because the artist didn't respond in time.</p>
        <p style="color:#717171;"><strong>You have not been charged.</strong> Any payment hold on your card has been released.</p>
        <p style="color:#717171;">There are plenty of talented artists on Sparq — we'd love to help you find the perfect match.</p>
        <a href="${APP_URL}/search" style="display:inline-block;background:#E96B56;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin:16px 0;">Find another artist</a>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Questions? Contact us at support@sparq.com.au</p>
      </div>
    `,
    category: 'marketing' as const,
  })
}
