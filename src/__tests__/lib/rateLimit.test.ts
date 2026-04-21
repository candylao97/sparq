/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * rate-limit.ts — production fail-closed behavior.
 *
 * The rate limiter is backed by Upstash Redis in production. Development falls
 * back to in-memory counters. If Redis env vars are missing in production, the
 * limiter must FAIL CLOSED (block all requests) to prevent an observable bypass
 * of per-user/per-IP quotas on sensitive routes (booking create, dispute open,
 * gift-card purchase, etc).
 *
 * This suite locks that contract in place.
 */

import { rateLimit } from '@/lib/rate-limit'

// Snapshot env so each test can safely mutate.
const ORIGINAL_ENV = { ...process.env }

describe('rate-limit.ts', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    // Default: clear any prior fetch mock so tests opt-in explicitly.
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
    global.fetch = originalFetch
  })

  describe('production with Redis misconfigured', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    it('returns false (fail-closed) on the first call', async () => {
      const allowed = await rateLimit('test-key:abc', 10, 60)
      expect(allowed).toBe(false)
    })

    it('returns false for every call regardless of limit', async () => {
      // A generous limit (1000/hour) should still yield false — fail-closed is
      // about missing Redis config, not about the quota itself.
      for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        const allowed = await rateLimit(`key-${i}`, 1000, 3600)
        expect(allowed).toBe(false)
      }
    })

    it('does NOT call fetch when env vars are missing', async () => {
      const fetchSpy = global.fetch as jest.Mock
      await rateLimit('x', 5, 60)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('development with Redis missing — in-memory fallback', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    it('allows the first request', async () => {
      const allowed = await rateLimit('dev-key:1', 3, 60)
      expect(allowed).toBe(true)
    })

    it('allows up to limit, then blocks', async () => {
      const key = `dev-key:burst:${Date.now()}`
      const results: boolean[] = []
      for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await rateLimit(key, 3, 60))
      }
      // First 3 allowed, last 2 blocked
      expect(results).toEqual([true, true, true, false, false])
    })

    it('resets after the window expires', async () => {
      const key = `dev-key:expiry:${Date.now()}`
      // Consume the whole quota (limit=1)
      expect(await rateLimit(key, 1, 60)).toBe(true)
      expect(await rateLimit(key, 1, 60)).toBe(false)
      // Jump clock past window by monkey-patching Date.now
      const realNow = Date.now
      try {
        Date.now = () => realNow() + 70_000
        expect(await rateLimit(key, 1, 60)).toBe(true)
      } finally {
        Date.now = realNow
      }
    })
  })

  describe('production with Redis configured', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'tkn_test'
    })

    it('allows when Redis INCR returns within limit', async () => {
      // Mock fetch: first call (INCR) returns {result: 1}, second call (EXPIRE) returns ok
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/incr/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ result: 1 }),
          })
        }
        if (url.includes('/expire/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ result: 1 }),
          })
        }
        return Promise.reject(new Error('unexpected url'))
      })

      const allowed = await rateLimit('prod:allowed', 10, 3600)
      expect(allowed).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/incr/'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('blocks when Redis INCR exceeds the limit', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: 11 }), // over limit of 10
        }),
      )
      const allowed = await rateLimit('prod:over', 10, 3600)
      expect(allowed).toBe(false)
    })

    it('URL-encodes keys with special characters', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: 1 }),
        }),
      )
      await rateLimit('booking-create-ip:1.2.3.4', 10, 3600)
      const firstCallUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
      // Colon and dots in IP must be encoded in the URL path
      expect(firstCallUrl).toContain('booking-create-ip%3A1.2.3.4')
    })

    it('falls back to in-memory when Redis is unreachable (network error)', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'))
      // In production with network failure, _redisPost returns null, so the limiter
      // uses in-memory fallback (not fail-closed). This is an explicit tradeoff:
      // fail-closed only triggers on missing CONFIG, not transient network errors.
      const allowed = await rateLimit('prod:netfail', 5, 60)
      expect(allowed).toBe(true)
    })

    it('falls back to in-memory when Redis returns non-OK HTTP', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })
      const allowed = await rateLimit('prod:httpfail', 5, 60)
      expect(allowed).toBe(true)
    })
  })
})
