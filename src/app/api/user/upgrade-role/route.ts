import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * QA-002 — Upgrade an authenticated user's role to add provider/artist access.
 *
 * Used by `/register/provider` when an already-logged-in CUSTOMER completes the
 * artist onboarding flow. Mirrors the ProviderProfile scaffolding that
 * `/api/auth/register` does for fresh signups (icalToken, scoreFactors) so
 * downstream pages don't trip over a stub profile.
 *
 * Role transitions:
 *   CUSTOMER → BOTH   (preserve customer access)
 *   PROVIDER → PROVIDER (no-op)
 *   BOTH     → BOTH     (no-op, ensures profile exists)
 *   ADMIN    → 403      (admins should not be self-onboarding artists)
 *
 * The client must call `useSession().update()` after this returns so the
 * NextAuth JWT picks up the new role on the next request — see the
 * `trigger === 'update'` handling in `src/lib/auth.ts`.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Admin accounts cannot self-onboard as artists.' },
      { status: 403 },
    )
  }

  const newRole = session.user.role === 'PROVIDER' ? 'PROVIDER' : 'BOTH'

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role: newRole,
      providerProfile: {
        upsert: {
          create: {
            icalToken: randomUUID(),
            scoreFactors: { create: { updatedAt: new Date() } },
          },
          update: {},
        },
      },
    },
  })

  return NextResponse.json({ success: true, role: user.role })
}
