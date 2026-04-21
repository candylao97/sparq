/**
 * NextRequest builder for API route tests.
 */
import { NextRequest } from 'next/server'

export interface MakeRequestOpts {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  searchParams?: Record<string, string | number>
}

export function makeRequest(url: string, opts: MakeRequestOpts = {}): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams } = opts

  // Append search params
  let fullUrl = url
  if (searchParams) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) qs.set(k, String(v))
    fullUrl = `${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`
  }

  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { ...headers },
  }
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
    if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json'
  }
  return new NextRequest(fullUrl, init)
}
