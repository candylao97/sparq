import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/auditLog'

function generateCode() {
  return randomBytes(6).toString('hex').toUpperCase()
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const vouchers = await prisma.giftVoucher.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ vouchers })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { amount, expiryDays = 365, recipientEmail, customCode } = await req.json()

  if (!amount || amount <= 0 || amount > 500) {
    return NextResponse.json({ error: 'Amount must be between $1 and $500' }, { status: 400 })
  }

  const code = customCode?.toUpperCase().trim() || `SPARQ-${generateCode()}`

  // Check code uniqueness
  const existing = await prisma.giftVoucher.findUnique({ where: { code } })
  if (existing) return NextResponse.json({ error: 'Code already exists' }, { status: 400 })

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  const voucher = await prisma.giftVoucher.create({
    data: {
      code,
      amount,
      issuedBy: (session.user as { id: string }).id,
      expiresAt,
    },
  })

  await logAdminAction({
    actorId: (session.user as { id: string }).id,
    action: 'VOUCHER_CREATED',
    targetType: 'GiftVoucher',
    targetId: voucher.id,
    details: { code, amount, expiryDays, recipientEmail },
  })

  return NextResponse.json({ voucher })
}
