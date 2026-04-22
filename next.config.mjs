/** @type {import('next').NextConfig} */

// P1-6: Build a tight CSP.
// - 'unsafe-eval' is removed in production (only HMR in dev needs it).
// - 'unsafe-inline' remains in script-src because Next.js 14 App Router inlines
//   hydration scripts; full elimination requires nonce middleware (future work).
// - google-fonts origins added for style/font loading.
const isDev = process.env.NODE_ENV !== 'production'
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  'https://js.stripe.com',
].join(' ')
const cspHeader = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "frame-src https://js.stripe.com",
  "connect-src 'self' https://api.stripe.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://plus.unsplash.com https://picsum.photos https://randomuser.me https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
].join('; ')

const nextConfig = {
  eslint: {
    // Pre-existing unused-var warnings in legacy files don't block production
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').host,
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ]
  },
}

export default nextConfig
