import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(8),
  password: z.string().min(8),
  role: z.enum(['CUSTOMER', 'PROVIDER']).default('CUSTOMER'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password, role } = schema.parse(body)
    const normalizedPhone = phone.replace(/[^\d+]/g, '')
    const normalizedEmail = email?.trim().toLowerCase() || null
    const resolvedName = name || normalizedEmail?.split('@')[0] || `sparq-${normalizedPhone.slice(-4)}`

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          normalizedEmail ? { email: normalizedEmail } : undefined,
          { phone: normalizedPhone },
        ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'Phone number or email already in use' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name: resolvedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashed,
        role,
        customerProfile: role === 'CUSTOMER' ? { create: {} } : undefined,
        providerProfile: role === 'PROVIDER' ? {
          create: {
            scoreFactors: { create: { updatedAt: new Date() } }
          }
        } : undefined,
      },
    })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
