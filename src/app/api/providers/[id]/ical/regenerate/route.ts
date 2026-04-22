import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.id !== params.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 3600 * 1000)
  const profile = await prisma.providerProfile.update({
    where: { userId: params.id },
    data: {
      icalToken: randomUUID(),
      icalTokenExpiresAt: oneYearFromNow,
    },
    select: { icalToken: true, icalTokenExpiresAt: true },
  })

  return NextResponse.json({ icalToken: profile.icalToken, expiresAt: profile.icalTokenExpiresAt })
}
