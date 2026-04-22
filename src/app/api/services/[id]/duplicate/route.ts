import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = await prisma.service.findUnique({ where: { id: params.id } })
  if (!service || service.providerProfileId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...rest } = service
  const duplicate = await prisma.service.create({
    data: {
      ...rest,
      title: `${service.title} (Copy)`,
      isActive: false, // Start inactive so artist can review before publishing
    },
  })

  // Copy add-ons from the original service
  const addons = await prisma.serviceAddon.findMany({
    where: { serviceId: service.id },
  })

  if (addons.length > 0) {
    await prisma.serviceAddon.createMany({
      data: addons.map(({ id: _id, serviceId: _sid, ...addonData }) => ({
        ...addonData,
        serviceId: duplicate.id,
      })),
    })
  }

  return NextResponse.json({ service: duplicate })
}
