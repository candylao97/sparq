import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Admin settings list error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 })
    }

    if (String(value).length > 500) {
      return NextResponse.json({ error: 'Value too long' }, { status: 400 })
    }

    const setting = await prisma.platformSetting.update({
      where: { key },
      data: { value: String(value) },
    })

    return NextResponse.json(setting)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }
    console.error('Admin setting update error:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}
