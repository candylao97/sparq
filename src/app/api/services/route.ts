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
      where: { providerId: profile.id, isDeleted: false },
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
    const { title, category, description, price, duration, locationTypes, maxGuests, instantBook } = body

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

    // P2-3: Enforce max services limit per provider (50)
    const SERVICE_LIMIT = 50
    const serviceCount = await prisma.service.count({
      where: { providerId: profile.id, isDeleted: false },
    })
    if (serviceCount >= SERVICE_LIMIT) {
      return NextResponse.json(
        { error: 'Service limit reached', message: 'You can have up to 50 services. Archive unused services to create new ones.' },
        { status: 400 }
      )
    }

    // T&S-R3: Warn if a service with a very similar title already exists for this provider
    const existingServices = await prisma.service.findMany({
      where: { providerId: profile.id, isDeleted: false },
      select: { title: true },
    })
    const titleLower = sanitizedTitle.toLowerCase().replace(/\s+/g, ' ').trim()
    const duplicateWarning = existingServices.some(s =>
      s.title.toLowerCase().replace(/\s+/g, ' ').trim() === titleLower
    )

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
        isActive: body.isActive !== false,
        instantBook: instantBook === true,
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

    return NextResponse.json({
      service,
      ...(duplicateWarning ? { warning: 'A service with this title already exists. Clients may find it confusing — consider using a different name.' } : {}),
    })
  } catch (error) {
    console.error('Service create error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
