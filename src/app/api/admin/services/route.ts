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
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const active = searchParams.get('active')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 25
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (active !== null && active !== '') where.isActive = active === 'true'
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { provider: { user: { name: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: {
        provider: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ])

  return NextResponse.json({ services, total, page, totalPages: Math.ceil(total / limit) })
}
