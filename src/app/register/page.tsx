'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { LogoFull } from '@/components/ui/Logo'

type Role = 'CLIENT' | 'ARTIST' | null

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span className={`h-[14px] w-[14px] animate-spin rounded-full border-[1.5px] flex-shrink-0 ${
      light ? 'border-white/30 border-t-white' : 'border-[#1A1A1A]/15 border-t-[#717171]'
    }`} />
  )
}

export default function RegisterPage() {
  const router = useRouter()

  const [selectedRole, setSelectedRole] = useState<Role>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) {
      toast.error('Please choose how you want to use Sparq.')
      return
    }
    if (!email.trim()) return

    if (selectedRole === 'ARTIST') {
      sessionStorage.setItem('sparq_pending_email', email.trim())
      router.push('/register/provider')
      return
    }

    // CLIENT — check if email exists then redirect
    setLoading(true)
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.exists) {
        router.push(`/login?email=${encodeURIComponent(email.trim())}`)
      } else {
        router.push(`/login?email=${encodeURIComponent(email.trim())}&new=1`)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!selectedRole) {
      toast.error('Please choose how you want to use Sparq first.')
      return
    }
    if (selectedRole === 'ARTIST') {
      router.push('/register/provider')
      return
    }
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/dashboard/customer' })
  }

  return (
    <div className="min-h-screen flex">

      {/* Left: beauty image panel — hidden on mobile */}
      <div className="relative hidden lg:block lg:w-[52%] xl:w-[58%] flex-shrink-0">
        <Image
          src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&h=1200&fit=crop&q=85"
          alt="Beauty artist at work"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="font-headline text-4xl text-white leading-[1.1] mb-3">
            Your next appointment,<br /><span className="italic text-[#E96B56]">starts here.</span>
          </p>
          <p className="text-white/60 text-sm">
            Australia&apos;s trusted nail &amp; lash marketplace.
          </p>
        </div>
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white min-h-screen">
        <div className="w-full max-w-[400px]">

          <div className="bg-white rounded-2xl border border-[#e8e1de] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* Header */}
            <div className="border-b border-[#e8e1de] px-8 pt-7 pb-6">
              <div className="flex justify-center mb-5">
                <LogoFull size="sm" />
              </div>
              <h1 className="text-center text-[1.1rem] font-semibold text-[#1A1A1A] leading-snug">
                Create your account
              </h1>
            </div>

            {/* Body */}
            <div className="px-8 py-7 space-y-5">

              {/* Role cards */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('CLIENT')}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all ${
                    selectedRole === 'CLIENT'
                      ? 'border-[#E96B56] bg-[#fff8f7]'
                      : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/40 hover:bg-[#fff8f7]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedRole === 'CLIENT' ? 'border-[#E96B56]' : 'border-[#e8e1de]'
                    }`}>
                      {selectedRole === 'CLIENT' && (
                        <div className="w-2 h-2 rounded-full bg-[#E96B56]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">I want to book beauty services</p>
                      <p className="text-xs text-[#717171] mt-0.5">Find and book artists near you</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('ARTIST')}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all ${
                    selectedRole === 'ARTIST'
                      ? 'border-[#E96B56] bg-[#fff8f7]'
                      : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/40 hover:bg-[#fff8f7]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedRole === 'ARTIST' ? 'border-[#E96B56]' : 'border-[#e8e1de]'
                    }`}>
                      {selectedRole === 'ARTIST' && (
                        <div className="w-2 h-2 rounded-full bg-[#E96B56]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">I want to offer my services</p>
                      <p className="text-xs text-[#717171] mt-0.5">Grow your client base on Sparq</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex w-full items-center rounded-xl border border-[#222222] px-4 py-3.5 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#F7F7F7] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? <Spinner /> : <GoogleIcon />}
                <span className="flex-1 text-center">Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <hr className="flex-1 border-[#e8e1de]" />
                <span className="text-xs font-semibold text-[#ADADAD]">or</span>
                <hr className="flex-1 border-[#e8e1de]" />
              </div>

              {/* Email form */}
              <form onSubmit={handleContinue} className="space-y-3">
                <div className="relative rounded-xl border border-[#e8e1de] transition-colors hover:border-[#b0b0b0] focus-within:border-[#1A1A1A]">
                  <label
                    htmlFor="email"
                    className="absolute top-3 left-4 text-[11px] font-semibold text-[#717171] pointer-events-none"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent px-4 pt-[26px] pb-3 text-sm text-[#1A1A1A] placeholder:text-[#BEBAB6] outline-none rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E96B56] to-[#C95444] py-3.5 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <Spinner light />}
                  Continue
                </button>
              </form>

              <p className="text-center text-[11px] text-[#ADADAD] leading-relaxed">
                By continuing you agree to our{' '}
                <Link href="/terms" className="underline underline-offset-2 hover:text-[#717171] transition-colors">
                  Terms
                </Link>
                {' '}&amp;{' '}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-[#717171] transition-colors">
                  Privacy Policy
                </Link>
              </p>

              <p className="text-center text-sm text-[#717171]">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#E96B56] transition-colors">
                  Log in
                </Link>
              </p>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
