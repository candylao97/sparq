import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 25
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [payouts, total, failedCount, pendingTotal] = await Promise.all([
    prisma.payout.findMany({
      where,
      include: {
        booking: {
          include: {
            customer: { select: { name: true, email: true } },
            provider: { select: { name: true, email: true } },
            service: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payout.count({ where }),
    prisma.payout.count({ where: { status: 'FAILED' } }),
    prisma.payout.aggregate({
      where: { status: 'SCHEDULED' },
      _sum: { amount: true },
    }),
  ])

  return NextResponse.json({
    payouts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    failedCount,
    pendingTotal: pendingTotal._sum.amount || 0,
  })
}
