import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { membership: true },
  })

  return NextResponse.json({ membership: customer?.membership || 'FREE' })
}
