import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — return the user's referral link (referrerId = their userId encoded in base64url)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://sparq.com.au'
  const code = Buffer.from(session.user.id).toString('base64url')
  const referralLink = `${baseUrl}/register?ref=${code}`

  // Count referrals
  const [total, completed] = await Promise.all([
    prisma.referral.count({ where: { referrerId: session.user.id } }),
    prisma.referral.count({ where: { referrerId: session.user.id, status: 'COMPLETED' } }),
  ])

  return NextResponse.json({ referralLink, total, completed })
}
