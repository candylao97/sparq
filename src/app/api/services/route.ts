import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ServiceCategory } from '@prisma/client'
import { filterContactInfo } from '@/lib/content-filter'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    const services = await prisma.service.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Services fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    const body = await req.json()
    const { title, category, description, price, duration, locationTypes, maxGuests } = body

    if (!title || !category || !price || !duration) {
      return NextResponse.json({ error: 'Title, category, price, and duration are required' }, { status: 400 })
    }
    if (!Object.values(ServiceCategory).includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (locationTypes && !['AT_HOME', 'STUDIO', 'BOTH'].includes(locationTypes)) {
      return NextResponse.json({ error: 'Invalid location type' }, { status: 400 })
    }

    // Filter contact info from title and description
    let sanitizedTitle = title.trim()
    let sanitizedDescription = description?.trim() || null
    const titleFilter = filterContactInfo(sanitizedTitle)
    if (titleFilter.flagged) {
      sanitizedTitle = titleFilter.text
    }
    let descriptionFilter: ReturnType<typeof filterContactInfo> | null = null
    if (sanitizedDescription) {
      descriptionFilter = filterContactInfo(sanitizedDescription)
      if (descriptionFilter.flagged) {
        sanitizedDescription = descriptionFilter.text
      }
    }

    const service = await prisma.service.create({
      data: {
        providerId: profile.id,
        title: sanitizedTitle,
        category,
        description: sanitizedDescription,
        price: Number(price),
        duration: Number(duration),
        locationTypes: locationTypes || 'BOTH',
        maxGuests: maxGuests ? Number(maxGuests) : null,
        isActive: true,
      },
    })

    // Log contact leakage flags
    const allMatches = [
      ...(titleFilter.flagged ? titleFilter.matches : []),
      ...(descriptionFilter?.flagged ? descriptionFilter.matches : []),
    ]
    if (allMatches.length > 0) {
      await prisma.contactLeakageFlag.create({
        data: {
          userId: session.user.id,
          flagType: descriptionFilter?.flagged && titleFilter.flagged ? 'MULTIPLE' : (descriptionFilter?.flagType || titleFilter.flagType || 'UNKNOWN'),
          snippet: allMatches.join(', '),
        },
      }).catch(() => {})
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Service create error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
