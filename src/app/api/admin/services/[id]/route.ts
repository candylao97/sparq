import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/auditLog'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { isActive, reason } = body

  await prisma.service.update({
    where: { id: params.id },
    data: { isActive },
  })

  await logAdminAction({
    actorId: (session.user as { id: string }).id,
    action: isActive ? 'ACTIVATE_SERVICE' : 'DEACTIVATE_SERVICE',
    targetType: 'Service',
    targetId: params.id,
    reason,
  })

  return NextResponse.json({ ok: true })
}
