/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * middleware.ts — route guards.
 *
 * next-auth's `withAuth` wraps the middleware so we exercise both the inner
 * `middleware` function (role & account-status redirects) and the `authorized`
 * callback (auth gate).
 *
 * Strategy: directly import the default export and invoke the wrapper with
 * synthesized NextRequest + mocked `req.nextauth.token`. We don't test the
 * next-auth internals — only our routing logic.
 */

import { NextRequest } from 'next/server'

// Mock next-auth/middleware so the default export is a function we control.
// withAuth(cb, opts) in the real impl returns a function that first checks
// `opts.callbacks.authorized` and, if true, runs `cb`. We replicate that.
jest.mock('next-auth/middleware', () => ({
  withAuth: (cb: any, opts: any) => {
    return async (req: any) => {
      const authorized = opts?.callbacks?.authorized?.({
        token: req.nextauth?.token ?? null,
        req,
      })
      if (!authorized) {
        // next-auth's default: redirect unauthenticated users to /api/auth/signin
        const { NextResponse } = await import('next/server')
        const signinUrl = new URL('/api/auth/signin', req.url)
        signinUrl.searchParams.set('callbackUrl', req.url)
        return NextResponse.redirect(signinUrl)
      }
      return cb(req)
    }
  },
}))

import middleware from '@/middleware'

type Token = {
  role?: 'ADMIN' | 'PROVIDER' | 'CUSTOMER' | 'BOTH'
  accountStatus?: 'ACTIVE' | 'UNDER_REVIEW' | 'SUSPENDED' | 'BANNED'
  sub?: string
} | null

function reqWithToken(pathname: string, token: Token): NextRequest {
  const url = `http://localhost${pathname}`
  const req = new NextRequest(url) as NextRequest & { nextauth: { token: Token } }
  ;(req as any).nextauth = { token }
  return req
}

async function runMiddleware(req: NextRequest) {
  // middleware default export is the wrapped handler (per our mock above)
  return (middleware as unknown as (r: NextRequest) => Promise<Response>)(req)
}

function locationOf(res: Response): string | null {
  return res.headers.get('location')
}

describe('middleware — admin guard', () => {
  it('redirects CUSTOMER trying to hit /admin → /dashboard/customer', async () => {
    const res = await runMiddleware(
      reqWithToken('/admin', { role: 'CUSTOMER', accountStatus: 'ACTIVE' }),
    )
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(locationOf(res)).toMatch(/\/dashboard\/customer$/)
  })

  it('redirects PROVIDER trying to hit /admin → /dashboard/provider (P0-4)', async () => {
    const res = await runMiddleware(
      reqWithToken('/admin/users', { role: 'PROVIDER', accountStatus: 'ACTIVE' }),
    )
    expect(locationOf(res)).toMatch(/\/dashboard\/provider$/)
  })

  it('redirects BOTH-role trying to hit /admin → /dashboard/provider (P0-4)', async () => {
    const res = await runMiddleware(
      reqWithToken('/admin/settings', { role: 'BOTH', accountStatus: 'ACTIVE' }),
    )
    expect(locationOf(res)).toMatch(/\/dashboard\/provider$/)
  })

  it('permits ADMIN through /admin', async () => {
    const res = await runMiddleware(
      reqWithToken('/admin', { role: 'ADMIN', accountStatus: 'ACTIVE' }),
    )
    // NextResponse.next() returns 200 (no redirect)
    expect(res.status).toBe(200)
  })
})

describe('middleware — account-status guards', () => {
  it('BANNED provider hitting /dashboard/provider → /account-suspended', async () => {
    const res = await runMiddleware(
      reqWithToken('/dashboard/provider', { role: 'PROVIDER', accountStatus: 'BANNED' }),
    )
    expect(locationOf(res)).toMatch(/\/account-suspended$/)
  })

  it('SUSPENDED provider hitting /dashboard/provider → /account-suspended', async () => {
    const res = await runMiddleware(
      reqWithToken('/dashboard/provider/services', { role: 'PROVIDER', accountStatus: 'SUSPENDED' }),
    )
    expect(locationOf(res)).toMatch(/\/account-suspended$/)
  })

  it('UNDER_REVIEW provider hitting /dashboard/provider → /account-suspended', async () => {
    const res = await runMiddleware(
      reqWithToken('/dashboard/provider', { role: 'PROVIDER', accountStatus: 'UNDER_REVIEW' }),
    )
    expect(locationOf(res)).toMatch(/\/account-suspended$/)
  })

  it('BANNED BOTH-role is also redirected away from /dashboard/provider (P0-4)', async () => {
    const res = await runMiddleware(
      reqWithToken('/dashboard/provider', { role: 'BOTH', accountStatus: 'BANNED' }),
    )
    expect(locationOf(res)).toMatch(/\/account-suspended$/)
  })

  it('BANNED customer hitting /dashboard/customer → /account-suspended (any role)', async () => {
    const res = await runMiddleware(
      reqWithToken('/dashboard/customer', { role: 'CUSTOMER', accountStatus: 'BANNED' }),
    )
    expect(locationOf(res)).toMatch(/\/account-suspended$/)
  })

  it('ACTIVE provider passes through /dashboard/provider', async () => {
    const res = await runMiddleware(
      reqWithToken('/dashboard/provider', { role: 'PROVIDER', accountStatus: 'ACTIVE' }),
    )
    expect(res.status).toBe(200)
  })
})

describe('middleware — authorized callback (auth gate)', () => {
  it('unauthenticated /dashboard/* → redirect to signin', async () => {
    const res = await runMiddleware(reqWithToken('/dashboard/customer', null))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(locationOf(res)).toMatch(/\/api\/auth\/signin/)
  })

  it('unauthenticated /book/:id → redirect to signin', async () => {
    const res = await runMiddleware(reqWithToken('/book/prov-123', null))
    expect(locationOf(res)).toMatch(/\/api\/auth\/signin/)
  })

  it('unauthenticated /account-settings → redirect to signin', async () => {
    const res = await runMiddleware(reqWithToken('/account-settings', null))
    expect(locationOf(res)).toMatch(/\/api\/auth\/signin/)
  })

  it('unauthenticated /messages → redirect to signin', async () => {
    const res = await runMiddleware(reqWithToken('/messages', null))
    expect(locationOf(res)).toMatch(/\/api\/auth\/signin/)
  })

  it('unauthenticated /admin → redirect to signin', async () => {
    const res = await runMiddleware(reqWithToken('/admin', null))
    expect(locationOf(res)).toMatch(/\/api\/auth\/signin/)
  })
})

describe('middleware — config matcher coverage', () => {
  // Lightweight sanity: ensure the exported config protects the critical prefixes.
  // Import the named export to inspect.
  it('exports matcher covering all guarded prefixes', async () => {
    const mod = await import('@/middleware')
    const matcher = mod.config.matcher as string[]
    expect(matcher).toEqual(
      expect.arrayContaining([
        '/dashboard/:path*',
        '/book/:path*',
        '/account-settings/:path*',
        '/messages/:path*',
        '/admin/:path*',
      ]),
    )
  })
})
