import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin routes - check role
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        // P0-4: PROVIDER and BOTH users redirect to provider dashboard, not customer
        if (token?.role === 'PROVIDER' || token?.role === 'BOTH') {
          return NextResponse.redirect(new URL('/dashboard/provider', req.url))
        }
        return NextResponse.redirect(new URL('/dashboard/customer', req.url))
      }
    }

    // Redirect BANNED/SUSPENDED/UNDER_REVIEW providers away from their dashboard
    // P0-4: Cover BOTH role (users who are both provider and customer)
    if (pathname.startsWith('/dashboard/provider') && (token?.role === 'PROVIDER' || token?.role === 'BOTH')) {
      const status = (token as any).accountStatus
      if (status === 'BANNED' || status === 'SUSPENDED' || status === 'UNDER_REVIEW') {
        return NextResponse.redirect(new URL('/account-suspended', req.url))
      }
    }

    // Redirect BANNED users (any role) away from all protected routes
    if ((token as any).accountStatus === 'BANNED') {
      return NextResponse.redirect(new URL('/account-suspended', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // These routes require authentication
        if (
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/book') ||
          pathname.startsWith('/account-settings') ||
          pathname.startsWith('/messages') ||
          pathname.startsWith('/admin')
        ) {
          return !!token
        }

        // All other routes are public
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/book/:path*',
    '/account-settings/:path*',
    '/messages/:path*',
    '/admin/:path*',
  ],
}
