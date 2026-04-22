import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    const photos = await prisma.portfolioPhoto.findMany({
      where: { providerId: profile.id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ photos })
  } catch (error) {
    console.error('Portfolio fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
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

    // Check photo limit
    const existingCount = await prisma.portfolioPhoto.count({
      where: { providerId: profile.id },
    })
    if (existingCount >= 20) {
      return NextResponse.json({ error: 'Maximum 20 photos allowed' }, { status: 400 })
    }

    const body = await req.json()
    const { image, caption } = body

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: `sparq/portfolio/${profile.id}`,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      ],
    })

    // Get the next order value
    const maxOrder = await prisma.portfolioPhoto.findFirst({
      where: { providerId: profile.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const photo = await prisma.portfolioPhoto.create({
      data: {
        providerId: profile.id,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        caption: caption || null,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ photo }, { status: 201 })
  } catch (error) {
    console.error('Portfolio upload error:', error)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }
}
