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
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const action = searchParams.get('action')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 100
  const skip = (page - 1) * limit

  const where = {
    ...(from && { createdAt: { gte: new Date(from) } }),
    ...(to && { createdAt: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to + 'T23:59:59Z') } }),
    ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ entries: logs, logs, total, page, totalPages: Math.ceil(total / limit) })
}
