import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const result = await prisma.processedWebhookEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  return NextResponse.json({ deleted: result.count })
}
