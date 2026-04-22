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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    // Verify the photo belongs to this provider
    const photo = await prisma.portfolioPhoto.findUnique({
      where: { id: params.id },
    })
    if (!photo || photo.providerProfileId !== profile.id) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    const body = await req.json()
    const updateData: { caption?: string | null; order?: number } = {}

    if ('caption' in body) {
      updateData.caption = body.caption || null
    }
    if ('order' in body && typeof body.order === 'number') {
      updateData.order = body.order
    }

    const updated = await prisma.portfolioPhoto.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ photo: updated })
  } catch (error) {
    console.error('Portfolio update error:', error)
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 })

    // Verify the photo belongs to this provider
    const photo = await prisma.portfolioPhoto.findUnique({
      where: { id: params.id },
    })
    if (!photo || photo.providerProfileId !== profile.id) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete from Cloudinary if we have a publicId
    if (photo.publicId) {
      await cloudinary.uploader.destroy(photo.publicId).catch(() => null)
    }

    await prisma.portfolioPhoto.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portfolio delete error:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
