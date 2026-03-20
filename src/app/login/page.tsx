'use client'
import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

function getRedirectForRole(role?: string) {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'PROVIDER':
      return '/dashboard/provider'
    default:
      return '/dashboard/customer'
  }
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const explicitCallback = searchParams.get('callbackUrl')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await signIn('credentials', { identifier: email.trim(), password, redirect: false })
      if (res?.error) {
        toast.error('That email and password don\u2019t match. Give it another go.')
      } else {
        toast.success('Welcome back!')
        // If there's an explicit callback, use it. Otherwise route by role.
        if (explicitCallback) {
          router.push(explicitCallback)
        } else {
          const session = await getSession()
          const role = (session?.user as { role?: string })?.role
          router.push(getRedirectForRole(role))
        }
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    // For Google OAuth, we can't check role before redirect, so use explicit or default
    await signIn('google', { callbackUrl: explicitCallback || '/dashboard/customer' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)] px-4 py-10">
      <div className="w-full max-w-[480px]">
        {/* Card */}
        <div className="rounded-[28px] border border-[#e8e1de] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          {/* Header */}
          <div className="border-b border-[#e8e1de] px-6 py-5 text-center">
            <h1 className="text-base font-semibold text-[#1A1A1A]">Log in</h1>
          </div>

          <div className="px-6 py-6">
            <h2 className="mb-6 text-2xl font-semibold text-[#1A1A1A]">
              Welcome to <span className="font-display-italic">Sparq</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                  autoFocus
                  required
                />
              </div>

              {/* Password */}
              <div className="relative overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3.5 pr-10 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#717171]"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="submit" loading={loading} fullWidth size="lg">
                Log in
              </Button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <hr className="flex-1 border-[#e8e1de]" />
              <span className="text-xs font-medium text-[#717171]">or</span>
              <hr className="flex-1 border-[#e8e1de]" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="flex w-full items-center rounded-xl border border-[#1A1A1A]/15 px-4 py-3.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef] disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="flex-1 text-center">Continue with Google</span>
            </button>
          </div>
        </div>

        {/* Footer links */}
        <p className="mt-5 text-center text-sm text-[#717171]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-[#E96B56] hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
