import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { savedProviders: true },
  })
  if (!profile) return NextResponse.json({ providers: [] })

  const providers = await prisma.user.findMany({
    where: { id: { in: profile.savedProviders } },
    include: {
      providerProfile: {
        include: { services: { take: 1, orderBy: { price: 'asc' } }, portfolio: { take: 1 } },
      },
    },
  })

  return NextResponse.json({ providers })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { providerId } = await req.json()
  if (!providerId) return NextResponse.json({ error: 'providerId required' }, { status: 400 })

  // P2-2: Check for existing profile first to prevent duplicates in the savedProviders array.
  const existing = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { savedProviders: true },
  })

  if (existing?.savedProviders.includes(providerId)) {
    return NextResponse.json({ saved: true, total: existing.savedProviders.length, alreadySaved: true })
  }

  const profile = await prisma.customerProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, savedProviders: [providerId] },
    update: { savedProviders: { push: providerId } },
    select: { savedProviders: true },
  })

  return NextResponse.json({ saved: true, total: profile.savedProviders.length })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { providerId } = await req.json()

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { savedProviders: true },
  })
  if (!profile) return NextResponse.json({ saved: false })

  await prisma.customerProfile.update({
    where: { userId: session.user.id },
    data: { savedProviders: profile.savedProviders.filter((id: string) => id !== providerId) },
  })

  return NextResponse.json({ saved: false })
}
