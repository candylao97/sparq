// Persistent rate limiter backed by Upstash Redis REST API.
// Falls back to in-memory when env vars are absent (local dev only).
// In production, missing env vars cause fail-closed behavior (all requests blocked).

const _fallback = new Map<string, { count: number; resetAt: number }>()

// Startup warning in production if Redis is not configured
if (process.env.NODE_ENV === 'production' && !process.env.UPSTASH_REDIS_REST_URL) {
  console.error('[RATE_LIMIT] CRITICAL: UPSTASH_REDIS_REST_URL is not set in production. All rate-limited endpoints will be blocked.')
}

async function _redisPost(path: string): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // In production, missing Redis config is a critical misconfiguration
    if (process.env.NODE_ENV === 'production') return -1 // sentinel: fail-closed
    return null
  }
  try {
    const res = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const { result } = await res.json() as { result: number }
    return typeof result === 'number' ? result : null
  } catch {
    return null
  }
}

/**
 * Returns true if the request is allowed, false if over the limit.
 * Uses Redis INCR + EXPIRE. Falls back to in-memory on cold start / dev.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const safeKey = encodeURIComponent(key)

  const count = await _redisPost(`/incr/${safeKey}`)
  if (count !== null) {
    // count === -1 is the production fail-closed sentinel (Redis env vars missing)
    if (count === -1) return false
    if (count === 1) {
      // best-effort: set expiry on first hit
      _redisPost(`/expire/${safeKey}/${windowSeconds}`).catch(() => {})
    }
    return count <= limit
  }

  // --- in-memory fallback (development only) ---
  const now = Date.now()
  const entry = _fallback.get(key)
  if (!entry || entry.resetAt < now) {
    _fallback.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return true
  }
  entry.count++
  return entry.count <= limit
}
