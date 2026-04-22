import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payout = await prisma.payout.findUnique({ where: { id: params.id } })
  if (!payout) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (payout.status !== 'FAILED') {
    return NextResponse.json({ error: 'Only FAILED payouts can be retried' }, { status: 400 })
  }

  await prisma.payout.update({
    where: { id: params.id },
    data: {
      status: 'SCHEDULED',
      scheduledAt: new Date(),
      failedAt: null,
      failureReason: null,
    },
  })

  return NextResponse.json({ ok: true, message: 'Payout reset to SCHEDULED — will process on next cron run' })
}
