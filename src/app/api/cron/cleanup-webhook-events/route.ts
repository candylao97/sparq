import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const { count } = await prisma.processedWebhookEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  return NextResponse.json({ deleted: count })
}
