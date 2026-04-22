import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { rateLimit } from '@/lib/rate-limit'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { section } = body

    if (section === 'personal') {
      const { name, phone } = body

      // Validate name: strip whitespace, reject if empty, max 100 chars
      if (name !== undefined) {
        const trimmedName = typeof name === 'string' ? name.trim() : ''
        if (trimmedName.length === 0) {
          return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
        }
        if (trimmedName.length > 100) {
          return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 })
        }
      }

      // Validate phone: max 20 chars, only allowed characters
      if (phone !== undefined && phone !== null && phone !== '') {
        if (typeof phone !== 'string' || phone.length > 20) {
          return NextResponse.json({ error: 'Phone number must be 20 characters or fewer' }, { status: 400 })
        }
        if (!/^[\d\s\+\-\(\)\.]{0,20}$/.test(phone)) {
          return NextResponse.json({ error: 'Phone number contains invalid characters' }, { status: 400 })
        }
      }

      const trimmedName = name !== undefined ? (name as string).trim() : undefined

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(trimmedName !== undefined && { name: trimmedName }),
          ...(phone !== undefined && { phone }),
        },
      })

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
        },
      })
    }

    if (section === 'password') {
      // Rate limit password change attempts: max 5 per hour per user
      const passwordChangeAllowed = await rateLimit(`password-change:${session.user.id}`, 5, 3600)
      if (!passwordChangeAllowed) {
        return NextResponse.json(
          { error: 'Too many password change attempts. Please try again later.' },
          { status: 429 }
        )
      }

      const { currentPassword, newPassword } = body

      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        )
      }

      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters' },
          { status: 400 }
        )
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      })

      if (!user?.password) {
        return NextResponse.json(
          { error: 'Cannot change password for OAuth accounts' },
          { status: 400 }
        )
      }

      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12)
      // T&S-7: Set passwordChangedAt to invalidate existing JWT tokens
      await prisma.user.update({
        where: { id: session.user.id },
        data: { password: hashedPassword, passwordChangedAt: new Date() },
      })

      return NextResponse.json({ success: true, message: 'Password updated successfully' })
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch (error) {
    console.error('Account settings update error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
