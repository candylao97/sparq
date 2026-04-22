import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { rateLimit } from './rate-limit'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null

        const email = credentials.identifier.trim().toLowerCase()

        // T&S-5: Rate limit login attempts per email (max 5 per 15-min window, persistent via Redis)
        const allowed = await rateLimit(`login:${email}`, 5, 900)
        if (!allowed) {
          throw new Error('Too many login attempts. Please try again in 15 minutes.')
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          return null
        }

        // Block sign-in for unverified email accounts — throw a coded error
        // so the login page can show a targeted message with a resend link
        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }

        return user
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      // M15: Ensure profiles exist for OAuth users
      if (account?.type === 'oauth' && user?.id) {
        const existingCustomer = await prisma.customerProfile.findUnique({
          where: { userId: user.id },
        })
        if (!existingCustomer) {
          await prisma.customerProfile.create({
            data: { userId: user.id },
          }).catch(() => {})
        }
        // If user is PROVIDER or BOTH role via OAuth, ensure ProviderProfile exists
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        })
        if (dbUser?.role === 'PROVIDER' || dbUser?.role === 'BOTH') {
          const existingProvider = await prisma.providerProfile.findUnique({
            where: { userId: user.id },
          })
          if (!existingProvider) {
            await prisma.providerProfile.create({
              data: { userId: user.id, city: 'Sydney' },
            }).catch(() => {})
          }
        }
      }
      return true
    },
    async jwt({ token, user }) {
      // TS-2: Use the more restrictive (higher severity) accountStatus between User and ProviderProfile.
      // This prevents a SUSPENDED provider from bypassing checks via their User-level ACTIVE status.
      const STATUS_SEVERITY: Record<string, number> = {
        ACTIVE: 0,
        UNDER_REVIEW: 1,
        SUSPENDED: 2,
        BANNED: 3,
      }
      const mostRestrictiveStatus = (userStatus: string, profileStatus: string | undefined): string => {
        const uSev = STATUS_SEVERITY[userStatus] ?? 0
        const pSev = STATUS_SEVERITY[profileStatus ?? 'ACTIVE'] ?? 0
        return pSev > uSev ? (profileStatus ?? 'ACTIVE') : userStatus
      }

      if (user) {
        token.role = user.role
        token.id = user.id
        // Store passwordChangedAt epoch so we can invalidate stale tokens
        const fullUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordChangedAt: true, accountStatus: true },
        })
        token.passwordChangedAt = fullUser?.passwordChangedAt?.getTime() ?? 0
        const userStatus = fullUser?.accountStatus ?? 'ACTIVE'
        // Also fetch provider account status and use the more restrictive of the two
        if (user.role === 'PROVIDER' || user.role === 'BOTH') {
          const profile = await prisma.providerProfile.findUnique({
            where: { userId: user.id },
            select: { accountStatus: true },
          })
          token.accountStatus = mostRestrictiveStatus(userStatus, profile?.accountStatus)
        } else {
          token.accountStatus = userStatus
        }
      } else if (token.id) {
        // T&S-7: On token refresh, check if password was changed after this token was issued.
        // If so, mark the token as expired so the session callback returns no user.
        const tokenIat = (token.iat as number ?? 0) * 1000 // convert JWT iat (seconds) to ms
        const storedPwChangedAt = (token.passwordChangedAt as number) ?? 0
        if (storedPwChangedAt > tokenIat) {
          // Password changed after token was issued — strip identity to force re-login
          return { ...token, id: '', role: '', error: 'password_changed' } as typeof token
        }
        // P0-3: Re-check account status every 60 seconds to detect suspensions quickly.
        // Reduced from 5 minutes (300s) to 60s so suspended accounts lose access faster.
        // Using a sliding window pattern avoids a DB hit on every single request while
        // still detecting suspensions within a short window.
        const STATUS_CHECK_INTERVAL = 60 * 1000
        const statusCheckedAt = (token.statusCheckedAt as number) ?? 0
        if (Date.now() - statusCheckedAt > STATUS_CHECK_INTERVAL) {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { accountStatus: true, role: true },
          })
          if (freshUser) {
            if (freshUser.role === 'PROVIDER' || freshUser.role === 'BOTH') {
              const freshProfile = await prisma.providerProfile.findUnique({
                where: { userId: token.id as string },
                select: { accountStatus: true },
              })
              token.accountStatus = mostRestrictiveStatus(freshUser.accountStatus, freshProfile?.accountStatus)
            } else {
              token.accountStatus = freshUser.accountStatus
            }
          }
          token.statusCheckedAt = Date.now()
        }
      }
      return token
    },
    async session({ session, token }) {
      // T&S-7: If token was invalidated due to password change, clear the session user
      if ((token as { error?: string }).error === 'password_changed') {
        session.user = undefined as unknown as typeof session.user
        return session
      }
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        ;(session.user as any).accountStatus = token.accountStatus
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
