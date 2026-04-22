import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { filterContactInfo } from '@/lib/content-filter'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        providerProfile: {
          include: {
            services: { select: { id: true, title: true } },
            portfolio: { select: { id: true, url: true } },
            verification: { select: { status: true } },
          },
        },
        customerProfile: { select: { membership: true } },
        _count: {
          select: {
            bookingsAsCustomer: true,
            reviews: true,
          },
        },
        reviews: {
          where: { isVisible: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            rating: true,
            text: true,
            createdAt: true,
            booking: {
              select: {
                provider: {
                  select: { name: true, image: true },
                },
                service: { select: { title: true } },
              },
            },
          },
        },
      },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const avgRating = user.reviews.length
      ? Math.round((user.reviews.reduce((s, r) => s + r.rating, 0) / user.reviews.length) * 10) / 10
      : null

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      totalBookings: user._count.bookingsAsCustomer,
      totalReviews: user._count.reviews,
      avgRating,
      recentReviews: user.reviews,
      providerProfile: user.providerProfile,
      customerProfile: user.customerProfile,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, phone, providerData } = body

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
      },
    })

    let updatedProvider = null
    if (providerData) {
      const existingProfile = await prisma.providerProfile.findUnique({
        where: { userId: session.user.id },
      })

      if (existingProfile) {
        // Filter contact info from public-facing text fields
        let sanitizedBio = providerData.bio
        let sanitizedTagline = providerData.tagline
        const leakageMatches: string[] = []

        if (sanitizedBio !== undefined && sanitizedBio) {
          const bioFilter = filterContactInfo(sanitizedBio)
          if (bioFilter.flagged) {
            sanitizedBio = bioFilter.text
            leakageMatches.push(...bioFilter.matches)
          }
        }
        if (sanitizedTagline !== undefined && sanitizedTagline) {
          const taglineFilter = filterContactInfo(sanitizedTagline)
          if (taglineFilter.flagged) {
            sanitizedTagline = taglineFilter.text
            leakageMatches.push(...taglineFilter.matches)
          }
        }

        // UX09: Build update data including yearsExperience and cancellation policy fields
        const profileUpdateData: Record<string, unknown> = {
          ...(providerData.bio !== undefined && { bio: sanitizedBio }),
          ...(providerData.tagline !== undefined && { tagline: sanitizedTagline }),
          ...(providerData.suburb !== undefined && { suburb: providerData.suburb }),
          ...(providerData.city !== undefined && { city: providerData.city }),
          ...(providerData.languages !== undefined && { languages: providerData.languages }),
          ...(providerData.offerAtHome !== undefined && { offerAtHome: Boolean(providerData.offerAtHome) }),
          ...(providerData.offerAtStudio !== undefined && { offerAtStudio: Boolean(providerData.offerAtStudio) }),
          ...(providerData.studioAddress !== undefined && { studioAddress: providerData.studioAddress }),
          ...(providerData.cancellationPolicy !== undefined && { cancellationPolicy: providerData.cancellationPolicy }),
          ...(providerData.cancellationPolicyType !== undefined && { cancellationPolicyType: providerData.cancellationPolicyType }),
          ...(providerData.yearsExperience !== undefined && {
            yearsExperience: typeof providerData.yearsExperience === 'number'
              ? providerData.yearsExperience
              : parseInt(providerData.yearsExperience),
          }),
        }

        updatedProvider = await prisma.providerProfile.update({
          where: { userId: session.user.id },
          data: profileUpdateData,
        })

        // Log contact leakage flags
        if (leakageMatches.length > 0) {
          await prisma.contactLeakageFlag.create({
            data: {
              userId: session.user.id,
              flagType: 'PROFILE',
              snippet: leakageMatches.join(', '),
            },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        image: updatedUser.image,
        role: updatedUser.role,
      },
      providerProfile: updatedProvider,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
