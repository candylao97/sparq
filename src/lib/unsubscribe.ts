/**
 * FIND-6 — Unsubscribe token + suppression helpers.
 *
 * AU Spam Act 2003 requires a functional unsubscribe mechanism on every
 * commercial electronic message. We implement it as:
 *   - one-click link (visible footer) → /api/unsubscribe?token=…
 *   - one-click POST (RFC 8058 List-Unsubscribe-Post header)
 *   - suppression list pre-check before every non-transactional send
 *
 * Tokens are HMAC-SHA256 of the recipient email with a server secret. They
 * don't expire by default — an unsubscribe link that "works forever" is
 * the expected user behaviour.
 */
import { createHmac, timingSafeEqual } from 'crypto'

// Base64url (URL-safe, padding-stripped) — tokens go in mailto and in URLs.
function b64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET
  if (!s) {
    // Fail loud in prod, fall back in dev — an unsigned token is worse than
    // a logged warning because suppression writes would accept any input.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('UNSUBSCRIBE_SECRET or NEXTAUTH_SECRET must be set in production')
    }
    return 'dev-only-unsafe-secret-do-not-use-in-prod'
  }
  return s
}

/**
 * Generate a stable unsubscribe token for a given email address. Same email
 * → same token across sends, so re-sending an email after unsubscribe
 * still resolves to the original user's suppression entry.
 */
export function unsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase()
  const sig = createHmac('sha256', secret()).update(normalized).digest()
  const payload = Buffer.from(normalized, 'utf8')
  return `${b64url(payload)}.${b64url(sig)}`
}

/**
 * Verify a token and extract the email it was issued for. Returns `null`
 * when the token is malformed, tampered with, or doesn't validate.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  try {
    const emailBuf = Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    const sigBuf   = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    const email = emailBuf.toString('utf8')
    const expectedSig = createHmac('sha256', secret()).update(email).digest()
    if (expectedSig.length !== sigBuf.length) return null
    if (!timingSafeEqual(expectedSig, sigBuf)) return null
    return email
  } catch {
    return null
  }
}

/**
 * Email categories. Transactional categories are exempt from suppression
 * checks per AU Spam Act s.5 ("designated commercial electronic message"
 * carve-outs: account maintenance, billing, service updates, etc.).
 *
 * **Assumption — flagged for human review:** the transactional list below
 * is the engineering default; product/legal should confirm before launch
 * whether any of these (especially `review_reminder` or `re_engagement`)
 * should be reclassified to marketing.
 */
export type EmailCategory =
  | 'transactional'  // booking confirmations, password reset, payout, verification
  | 'marketing'      // promotions, re-engagement, newsletter

const TRANSACTIONAL_EXEMPT: ReadonlySet<EmailCategory> = new Set<EmailCategory>(['transactional'])

export function isTransactional(category: EmailCategory): boolean {
  return TRANSACTIONAL_EXEMPT.has(category)
}
