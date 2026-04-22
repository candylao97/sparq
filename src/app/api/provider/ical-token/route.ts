import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// GET: return current icalToken (or generate one if missing)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { icalToken: true },
  })
  if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

  // Backfill: if the profile was created before we added icalToken, generate one now
  if (!profile.icalToken) {
    const token = randomUUID()
    await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: { icalToken: token },
    })
    return NextResponse.json({ icalToken: token })
  }

  return NextResponse.json({ icalToken: profile.icalToken })
}

// POST: rotate the icalToken (invalidates old URL immediately)
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

  const newToken = randomUUID()
  await prisma.providerProfile.update({
    where: { userId: session.user.id },
    data: { icalToken: newToken },
  })

  return NextResponse.json({ icalToken: newToken })
}
