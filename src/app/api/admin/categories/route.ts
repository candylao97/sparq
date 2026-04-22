import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const SERVICE_CATEGORIES = [
  'NAILS',
  'LASHES',
] as const

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [serviceCounts, services] = await Promise.all([
      prisma.service.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      prisma.service.findMany({
        select: { category: true, providerProfileId: true },
        distinct: ['providerProfileId', 'category'],
      }),
    ])

    const serviceCountMap = new Map(serviceCounts.map(c => [c.category, c._count.id]))

    const providerCountMap = new Map<string, number>()
    for (const s of services) {
      providerCountMap.set(s.category, (providerCountMap.get(s.category) || 0) + 1)
    }

    const categories = SERVICE_CATEGORIES.map(category => ({
      name: category,
      serviceCount: serviceCountMap.get(category) || 0,
      providerCount: providerCountMap.get(category) || 0,
    }))

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Admin categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
