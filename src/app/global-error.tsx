'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111' }}>Something went wrong</h1>
          <p style={{ marginTop: '12px', fontSize: '14px', color: '#717171', maxWidth: '400px' }}>
            We hit an unexpected issue. Try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: '24px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#fff', backgroundColor: '#111', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
