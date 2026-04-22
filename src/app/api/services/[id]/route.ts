import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'
import type { Prisma } from '@prisma/client'
import { ServiceLocation, ServiceCategory } from '@prisma/client'

const VALID_LOCATION_TYPES = ['AT_HOME', 'STUDIO', 'BOTH'] as const
type LocationType = (typeof VALID_LOCATION_TYPES)[number]

const VALID_CATEGORIES = [
  'NAILS', 'LASHES', 'HAIR', 'MAKEUP', 'BROWS', 'WAXING', 'MASSAGE', 'FACIALS', 'OTHER',
] as const
type ValidCategory = (typeof VALID_CATEGORIES)[number]

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    const service = await prisma.service.findFirst({
      where: { id: params.id, providerId: profile.id, isDeleted: false },
      include: { addons: true },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Service fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    const service = await prisma.service.findFirst({ where: { id: params.id, providerId: profile.id } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const body = await req.json() as {
      title?: string
      description?: string
      price?: number
      duration?: number
      locationTypes?: string
      maxGuests?: number
      isActive?: boolean
      instantBook?: boolean
      category?: string
    }

    const { title, description, price, duration, locationTypes, maxGuests, isActive, instantBook, category } = body

    // Validate price and duration when provided
    if (price !== undefined && Number(price) <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 })
    }
    if (duration !== undefined && Number(duration) <= 0) {
      return NextResponse.json({ error: 'Duration must be greater than 0' }, { status: 400 })
    }
    if (locationTypes !== undefined && !VALID_LOCATION_TYPES.includes(locationTypes as LocationType)) {
      return NextResponse.json({ error: 'Invalid location type' }, { status: 400 })
    }
    if (category !== undefined && !VALID_CATEGORIES.includes(category as ValidCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    const typedLocationTypes = locationTypes as ServiceLocation | undefined
    const typedCategory = category as ServiceCategory | undefined

    // Apply contact info filtering to title and description
    let sanitizedTitle: string | undefined
    let sanitizedDescription: string | null | undefined
    let titleFilterResult: ReturnType<typeof filterContactInfo> | null = null
    let descriptionFilterResult: ReturnType<typeof filterContactInfo> | null = null

    if (title !== undefined) {
      sanitizedTitle = title.trim()
      titleFilterResult = filterContactInfo(sanitizedTitle)
      if (titleFilterResult.flagged) {
        sanitizedTitle = titleFilterResult.text
      }
    }

    if (description !== undefined) {
      sanitizedDescription = description?.trim() || null
      if (sanitizedDescription) {
        descriptionFilterResult = filterContactInfo(sanitizedDescription)
        if (descriptionFilterResult.flagged) {
          sanitizedDescription = descriptionFilterResult.text
        }
      }
    }

    // BL-C2: Block deactivation when active bookings exist
    if (isActive === false) {
      const activeBookings = await prisma.booking.count({
        where: {
          serviceId: params.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      if (activeBookings > 0) {
        return NextResponse.json(
          { error: `This service has ${activeBookings} active booking${activeBookings !== 1 ? 's' : ''}. Please cancel or complete them before deactivating.` },
          { status: 409 }
        )
      }
    }

    // Build update data with only the provided fields
    const updateData: Prisma.ServiceUpdateInput = {}

    if (sanitizedTitle !== undefined) updateData.title = sanitizedTitle
    if (sanitizedDescription !== undefined) updateData.description = sanitizedDescription
    if (price !== undefined) updateData.price = Number(price)
    if (duration !== undefined) updateData.duration = Number(duration)
    if (typedLocationTypes !== undefined) updateData.locationTypes = typedLocationTypes
    if (maxGuests !== undefined) updateData.maxGuests = maxGuests ? Number(maxGuests) : null
    if (isActive !== undefined) updateData.isActive = isActive
    if (instantBook !== undefined) updateData.instantBook = instantBook
    if (typedCategory !== undefined) updateData.category = typedCategory

    const updatedService = await prisma.service.update({
      where: { id: params.id },
      data: updateData,
    })

    // Log any contact leakage flags detected during the update
    const allMatches = [
      ...(titleFilterResult?.flagged ? titleFilterResult.matches : []),
      ...(descriptionFilterResult?.flagged ? descriptionFilterResult.matches : []),
    ]
    if (allMatches.length > 0) {
      await prisma.contactLeakageFlag.create({
        data: {
          userId: session.user.id,
          flagType:
            descriptionFilterResult?.flagged && titleFilterResult?.flagged
              ? 'MULTIPLE'
              : (descriptionFilterResult?.flagType ?? titleFilterResult?.flagType ?? 'UNKNOWN'),
          snippet: allMatches.join(', '),
        },
      }).catch(() => {})
    }

    return NextResponse.json({ service: updatedService })
  } catch (error) {
    console.error('Service update error:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    const service = await prisma.service.findFirst({ where: { id: params.id, providerId: profile.id } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    // Check for any active (non-terminal) bookings before soft-deleting
    const activeBookings = await prisma.booking.count({
      where: {
        serviceId: params.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `This service has ${activeBookings} active booking(s). Please wait for them to complete before deleting.` },
        { status: 400 }
      )
    }

    // Soft-delete: isDeleted hides from public listings; isActive: false hides from booking flow
    await prisma.service.update({
      where: { id: params.id },
      data: { isDeleted: true, isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Service delete error:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
