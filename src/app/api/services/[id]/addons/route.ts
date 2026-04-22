import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const addons = await prisma.serviceAddon.findMany({
    where: { serviceId: params.id, isActive: true },
    select: { id: true, name: true, price: true, duration: true },
    orderBy: { price: 'asc' },
  })
  return NextResponse.json({ addons })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, price, duration = 0 } = await req.json()
    if (!name || price === undefined || price === null) {
      return NextResponse.json({ error: 'name and price are required' }, { status: 400 })
    }

    // Verify the service belongs to this provider
    const service = await prisma.service.findFirst({
      where: { id: params.id, provider: { userId: session.user.id } },
      select: { id: true },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const addon = await prisma.serviceAddon.create({
      data: {
        serviceId: params.id,
        name: String(name).trim(),
        price: parseFloat(String(price)),
        duration: parseInt(String(duration)) || 0,
        isActive: true,
      },
      select: { id: true, name: true, price: true, duration: true },
    })

    return NextResponse.json({ addon }, { status: 201 })
  } catch (error) {
    console.error('Addon create error:', error)
    return NextResponse.json({ error: 'Failed to create add-on' }, { status: 500 })
  }
}
