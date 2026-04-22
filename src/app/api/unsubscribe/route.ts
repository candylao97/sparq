/**
 * FIND-6 — Unsubscribe endpoint.
 *
 * Supports both:
 *   GET  /api/unsubscribe?token=…  → human click from email footer.
 *        Writes suppression, then 302-redirects to /unsubscribe for a
 *        friendly confirmation.
 *   POST /api/unsubscribe?token=…  → RFC 8058 one-click from the
 *        Gmail/Outlook/Apple Mail native Unsubscribe button.
 *        Writes suppression, returns 200 with no body.
 *
 * Tokens are validated via HMAC (see `src/lib/unsubscribe.ts`). A
 * malformed/tampered token gets a 400 — we do NOT silently succeed to
 * avoid a leak of valid-email enumeration.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function handle(req: NextRequest, method: 'GET' | 'POST') {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }
  const email = verifyUnsubscribeToken(token)
  if (!email) {
    return NextResponse.json({ error: 'Invalid unsubscribe link' }, { status: 400 })
  }

  // Upsert so replays (multiple clicks, browsers that fire both the
  // native button POST and a follow-up GET, etc.) are idempotent.
  await prisma.suppression.upsert({
    where: { email },
    create: {
      email,
      reason: 'user_unsubscribe',
      unsubscribeToken: token,
    },
    update: {},
  })

  if (method === 'POST') {
    // RFC 8058 — one-click. Body-less 200 is enough.
    return new NextResponse(null, { status: 200 })
  }
  // Browser GET — friendly confirmation page.
  return NextResponse.redirect(
    new URL(`/unsubscribe?email=${encodeURIComponent(email)}`, APP_URL),
  )
}

export async function GET(req: NextRequest)  { return handle(req, 'GET') }
export async function POST(req: NextRequest) { return handle(req, 'POST') }
