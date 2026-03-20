import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (active === 'true') where.isActive = true
    if (active === 'false') where.isActive = false
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { postcode: { contains: search } },
      ]
    }

    const suburbs = await prisma.suburb.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ suburbs })
  } catch (error) {
    console.error('Admin suburbs list error:', error)
    return NextResponse.json({ error: 'Failed to fetch suburbs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, postcode, state, city, isActive } = body

    if (!name || !postcode) {
      return NextResponse.json({ error: 'Name and postcode are required' }, { status: 400 })
    }

    const suburb = await prisma.suburb.create({
      data: {
        name,
        postcode,
        state: state || 'NSW',
        city: city || 'Sydney',
        isActive: isActive !== false,
      },
    })

    return NextResponse.json(suburb, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Suburb with this name and postcode already exists' }, { status: 409 })
    }
    console.error('Admin suburb create error:', error)
    return NextResponse.json({ error: 'Failed to create suburb' }, { status: 500 })
  }
}
