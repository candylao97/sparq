import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { serviceRadius, latitude, longitude, studioAddress, offerAtHome, offerAtStudio } = body

    if (serviceRadius !== undefined && (serviceRadius < 1 || serviceRadius > 100)) {
      return NextResponse.json(
        { error: 'Service radius must be between 1 and 100 km' },
        { status: 400 }
      )
    }

    const profile = await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: {
        ...(serviceRadius !== undefined && { serviceRadius }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(studioAddress !== undefined && { studioAddress }),
        ...(offerAtHome !== undefined && { offerAtHome }),
        ...(offerAtStudio !== undefined && { offerAtStudio }),
      },
    })

    return NextResponse.json({
      serviceRadius: profile.serviceRadius,
      latitude: profile.latitude,
      longitude: profile.longitude,
      studioAddress: profile.studioAddress,
      offerAtHome: profile.offerAtHome,
      offerAtStudio: profile.offerAtStudio,
    })
  } catch (error) {
    console.error('Service area update error:', error)
    return NextResponse.json({ error: 'Failed to update service area' }, { status: 500 })
  }
}
