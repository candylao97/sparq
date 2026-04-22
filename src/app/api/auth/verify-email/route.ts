import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
  }

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: email.toLowerCase(), token } },
    })

    if (!record) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email.toLowerCase(), token } },
      })
      return NextResponse.redirect(new URL('/verify-email?error=expired', req.url))
    }

    // Mark email as verified
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { emailVerified: new Date() },
    })

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email.toLowerCase(), token } },
    })

    return NextResponse.redirect(new URL('/verify-email?success=1', req.url))
  } catch {
    return NextResponse.redirect(new URL('/verify-email?error=server', req.url))
  }
}
