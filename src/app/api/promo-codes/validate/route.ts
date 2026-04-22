import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headersList.get('x-real-ip')
    || 'anonymous'

  const allowed = await rateLimit(`promo-validate:${ip}`, 10, 60)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 })
  }

  // P2-A: Additional session-based rate limit to prevent authenticated users from bypassing IP limit.
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const userAllowed = await rateLimit(`promo_validate:user:${session.user.id}`, 20, 3600)
    if (!userAllowed) {
      return NextResponse.json({ error: 'Too many promo code attempts. Please try again later.' }, { status: 429 })
    }
  }

  const { code, orderAmount } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })
  if (typeof orderAmount !== 'number' || orderAmount <= 0) return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 })

  const promo = await prisma.promoCode.findUnique({
    where: { code: String(code).toUpperCase().trim() },
  })

  if (!promo || !promo.isActive) {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
  }
  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
  }
  // M-6: Budget cap check — block if the code has issued its maximum total discount
  // Note: budgetCap/totalDiscountIssued require `prisma db push` to take effect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promoAny = promo as any
  if (promoAny.budgetCap && promoAny.totalDiscountIssued >= promoAny.budgetCap) {
    return NextResponse.json({ error: 'This promo code has reached its maximum discount limit' }, { status: 400 })
  }
  if (orderAmount < promo.minOrderAmount) {
    return NextResponse.json({
      error: `Minimum order amount of $${promo.minOrderAmount} required for this code`,
    }, { status: 400 })
  }

  if (session?.user?.id) {
    const existingUsage = await prisma.promoCodeUsage.findUnique({
      where: { promoCodeId_userId: { promoCodeId: promo.id, userId: session.user.id } },
    })
    if (existingUsage) {
      return NextResponse.json({ valid: false, error: 'You have already used this promo code.' }, { status: 400 })
    }
  }

  // P2-6: Use Math.floor for PERCENT discounts to always round in the platform's favour.
  // e.g. 10% of $9.99 = $0.999 → floor to $0.99 (not $1.00 via Math.round).
  const discount = promo.discountType === 'PERCENT'
    ? Math.floor(orderAmount * (promo.discountValue / 100) * 100) / 100
    : Math.min(promo.discountValue, orderAmount)

  return NextResponse.json({
    valid: true,
    discount,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    description: promo.description,
  })
}
