import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin routes - check role
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard/customer', req.url))
      }
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
