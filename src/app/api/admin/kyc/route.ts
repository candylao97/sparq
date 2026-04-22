import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeRiskSignals } from '@/lib/riskScoring'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const riskLevel = searchParams.get('risk') || ''
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 25
  const skip = (page - 1) * limit

  const kycWhere: Record<string, unknown> = {}
  if (status) kycWhere.status = status
  if (riskLevel) kycWhere.riskLevel = riskLevel

  const providerWhere: Record<string, unknown> = { kycRecord: kycWhere }
  if (search) {
    providerWhere.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [providers, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where: providerWhere,
      include: {
        user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
        kycRecord: true,
        verification: { select: { status: true } },
        _count: { select: { services: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.providerProfile.count({ where: providerWhere }),
  ])

  // For providers without a KYC record yet, auto-create one
  const needsRecord = providers.filter(p => !p.kycRecord)
  if (needsRecord.length > 0) {
    await Promise.all(
      needsRecord.map(p =>
        prisma.kYCRecord.create({ data: { providerProfileId: p.id } }).catch(() => null)
      )
    )
  }

  return NextResponse.json({
    providers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

// Seed KYC records for all existing providers (utility endpoint)
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providers = await prisma.providerProfile.findMany({
    where: { kycRecord: null },
    select: { id: true },
  })

  let created = 0
  for (const p of providers) {
    const { signals, level } = await computeRiskSignals(p.id)
    await prisma.kYCRecord.upsert({
      where: { providerProfileId: p.id },
      create: {
        providerProfileId: p.id,
        riskLevel: level,
        riskSignals: JSON.parse(JSON.stringify(signals)),
      },
      update: {
        riskLevel: level,
        riskSignals: JSON.parse(JSON.stringify(signals)),
      },
    })
    created++
  }

  return NextResponse.json({ seeded: created })
}
