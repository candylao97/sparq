import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

/**
 * GET /api/gift-cards/validate?code=SPARQ-XXXXXXXX
 *
 * Validates a gift voucher code without redeeming it.
 * Returns the voucher amount on success so the UI can apply the
 * discount preview before the booking is submitted.
 *
 * Rate-limited to 5 checks per user per hour to prevent brute-forcing.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // T&S-4: IP-based rate limit — 10 gift card validations per IP per hour to prevent brute-forcing
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipAllowed = await rateLimit(`gift-card-ip:${ip}`, 10, 3600)
  if (!ipAllowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // BL-L1: brute-force protection — 5 attempts per user per hour
  const rateLimitAllowed = await rateLimit(`voucher-validate:${session.user.id}`, 5, 3600)
  if (!rateLimitAllowed) {
    return NextResponse.json(
      { error: 'Too many voucher attempts. Please wait before trying again.' },
      { status: 429 }
    )
  }

  const code = new URL(req.url).searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const voucher = await prisma.giftVoucher.findUnique({ where: { code } })

  if (!voucher) {
    return NextResponse.json({ valid: false, error: 'Voucher code not found' }, { status: 200 })
  }

  if (voucher.isRedeemed) {
    return NextResponse.json({ valid: false, error: 'This voucher has already been used' }, { status: 200 })
  }

  // Grace period: 90 minutes past expiry for timezone / midnight checkout edge cases
  const gracePeriodMs = 90 * 60 * 1000
  const effectiveNow = new Date(Date.now() - gracePeriodMs)
  if (voucher.expiresAt < effectiveNow) {
    return NextResponse.json({ valid: false, error: 'This voucher has expired' }, { status: 200 })
  }

  return NextResponse.json({
    valid: true,
    amount: voucher.amount,
    code: voucher.code,
    expiresAt: voucher.expiresAt.toISOString(),
  })
}
