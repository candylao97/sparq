'use client'

import { useState, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { LogoFull } from '@/components/ui/Logo'

type Step = 'email' | 'login' | 'signup'

const DEV_ACCOUNTS = [
  { label: 'Artist',  email: 'lily.nguyen@example.com', password: 'provider123', role: 'PROVIDER' },
  { label: 'Client',  email: 'emma@customer.com',        password: 'password123', role: 'CUSTOMER' },
  { label: 'Admin',   email: 'admin@sparq.com.au',       password: 'admin123456', role: 'ADMIN'    },
] as const

function getRedirectForRole(role?: string) {
  switch (role) {
    case 'ADMIN':    return '/admin'
    case 'PROVIDER': return '/dashboard/provider'
    default:         return '/dashboard/customer'
  }
}

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

function LoginPageInner() {
  const router           = useRouter()
  const searchParams     = useSearchParams()
  const explicitCallback = searchParams.get('callbackUrl')
  const errorParam       = searchParams.get('error')

  const [step,          setStep]          = useState<Step>('email')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [devLoading,    setDevLoading]    = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  // FIND-4: consent checkbox state (signup step only).
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const isEmailNotVerified = errorParam === 'EMAIL_NOT_VERIFIED'

  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address first, then click Resend.')
      return
    }
    setResendLoading(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        toast.success('Verification email sent — check your inbox.')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Could not resend. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleDevLogin = async (account: typeof DEV_ACCOUNTS[number]) => {
    setDevLoading(account.label)
    try {
      const res = await signIn('credentials', {
        identifier: account.email,
        password: account.password,
        redirect: false,
      })
      if (res?.error) {
        toast.error(`Could not log in as ${account.label}`)
      } else {
        toast.success(`Logged in as ${account.label}`)
        router.push(getRedirectForRole(account.role))
      }
    } finally {
      setDevLoading(null)
    }
  }

  // ── Step 1: check if email is new or returning ──────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/check-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      setStep(data.exists ? 'login' : 'signup')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2a: returning user ──────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await signIn('credentials', { identifier: email.trim(), password, redirect: false })
      if (res?.error) {
        toast.error('Incorrect password. Give it another go.')
      } else {
        toast.success('Welcome back!')
        router.refresh()
        if (explicitCallback) {
          router.push(explicitCallback)
        } else {
          const session = await getSession()
          const role    = (session?.user as { role?: string })?.role
          router.push(getRedirectForRole(role))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2b: new user ────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    // FIND-4: hard-gate the client side as well as the server — friendlier UX
    // than round-tripping for the error.
    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Service to continue.')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email: email.trim(),
          password,
          role: 'CUSTOMER',
          acceptedTerms: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Couldn\u2019t create your account. Please try again.')
        return
      }
      // Redirect to verify-email page — user must confirm email before signing in
      router.push('/verify-email')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: explicitCallback || '/dashboard/customer' })
  }

  const goBack = () => {
    setStep('email')
    setPassword('')
    setShowPw(false)
  }

  return (
    <div className="min-h-screen flex">

      {/* Left: beauty image panel — hidden on mobile */}
      <div className="relative hidden lg:block lg:w-[52%] xl:w-[58%] flex-shrink-0">
        <Image
          src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&h=1200&fit=crop&q=85"
          alt="Beauty service"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for depth */}
        <div className="absolute inset-0 bg-black/20" />
        {/* Bottom branding */}
        <div className="absolute bottom-10 left-10 right-10">
          <p className="font-headline text-4xl text-white leading-[1.1] mb-3">
            Book beauty,<br /><span className="italic text-[#E96B56]">effortlessly.</span>
          </p>
          <p className="text-white/60 text-sm">
            Australia&apos;s trusted nail &amp; lash marketplace.
          </p>
        </div>
        {/* Right-side fade to form panel */}
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white min-h-screen">
        <div className="w-full max-w-[400px]">

        <div className="bg-white rounded-2xl border border-[#e8e1de] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">

          {/* ── Header ── */}
          <div className="border-b border-[#e8e1de] px-8 pt-7 pb-6">
            {/* Logo row — back button left, logo centred */}
            <div className="grid grid-cols-3 items-center mb-5">
              <div>
                {step !== 'email' && (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label="Back"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#F7F7F7]"
                  >
                    <ArrowLeft className="h-4 w-4 text-[#1A1A1A]" />
                  </button>
                )}
              </div>
              <div className="flex justify-center">
                <LogoFull size="sm" />
              </div>
              <div />
            </div>

            {/* Headline */}
            <h1 className="text-center text-[1.1rem] font-semibold text-[#1A1A1A] leading-snug">
              {step === 'email'  && 'Log in or sign up'}
              {step === 'login'  && 'Welcome back'}
              {step === 'signup' && 'Create your account'}
            </h1>
          </div>

          {/* ── Body ── */}
          <div className="px-8 py-7">

            {/* TS-2: Email not verified banner */}
            {isEmailNotVerified && (
              <div className="mb-5 rounded-xl bg-[#fdf6f4] border border-[#E96B56]/30 px-4 py-3.5">
                <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Please verify your email</p>
                <p className="text-xs text-[#717171] mb-2">
                  Check your inbox for a verification link before signing in.
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="text-xs font-semibold text-[#E96B56] hover:underline disabled:opacity-50"
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}

            {/* ── STEP 1: Email ── */}
            {step === 'email' && (
              <div className="space-y-4">
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
                <form onSubmit={handleEmailSubmit} className="space-y-3">
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
                      autoFocus
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
              </div>
            )}

            {/* ── STEP 2: Password (login or signup) ── */}
            {(step === 'login' || step === 'signup') && (
              <div className="space-y-4">
                {/* Email chip — shows which account */}
                <div className="flex items-center gap-2.5 rounded-xl border border-[#e8e1de] bg-[#F7F7F7] px-4 py-3">
                  <Mail className="h-4 w-4 flex-shrink-0 text-[#717171]" />
                  <span className="flex-1 truncate text-sm text-[#1A1A1A]">{email}</span>
                </div>

                <form
                  onSubmit={step === 'login' ? handleLogin : handleSignup}
                  className="space-y-3"
                >
                  {/* Password */}
                  <div className="relative rounded-xl border border-[#e8e1de] transition-colors hover:border-[#b0b0b0] focus-within:border-[#1A1A1A]">
                    <label
                      htmlFor="password"
                      className="absolute top-3 left-4 text-[11px] font-semibold text-[#717171] pointer-events-none"
                    >
                      {step === 'login' ? 'Password' : 'Create a password'}
                    </label>
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={step === 'login' ? 'Your password' : 'Min. 8 characters'}
                      autoComplete={step === 'login' ? 'current-password' : 'new-password'}
                      autoFocus
                      required
                      minLength={8}
                      className="w-full bg-transparent px-4 pt-[26px] pb-3 pr-12 text-sm text-[#1A1A1A] placeholder:text-[#BEBAB6] outline-none rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 bottom-3 text-[#717171] hover:text-[#1A1A1A] transition-colors"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Forgot password — login only */}
                  {step === 'login' && (
                    <div className="flex justify-end">
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#E96B56] transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  )}

                  {/* FIND-4: explicit ToS consent checkbox — signup only.
                      Replaces the passive "by continuing" footer with an
                      interactive, auditable consent capture. */}
                  {step === 'signup' && (
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={e => setAcceptedTerms(e.target.checked)}
                        required
                        className="mt-0.5 h-4 w-4 rounded border-[#e8e1de] text-[#E96B56] focus:ring-[#E96B56]"
                        data-testid="tos-consent-checkbox"
                      />
                      <span className="text-[12px] text-[#717171] leading-relaxed">
                        I agree to Sparq&apos;s{' '}
                        <Link href="/terms" className="underline underline-offset-2 text-[#1A1A1A] hover:text-[#E96B56] transition-colors">
                          Terms of Service
                        </Link>
                        {' '}&amp;{' '}
                        <Link href="/privacy" className="underline underline-offset-2 text-[#1A1A1A] hover:text-[#E96B56] transition-colors">
                          Privacy Policy
                        </Link>.
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (step === 'signup' && !acceptedTerms)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E96B56] to-[#C95444] py-3.5 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading && <Spinner light />}
                    {step === 'login' ? 'Log in' : 'Create account'}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>

        {/* ── Dev quick-login strip ── */}
        {isDev && (
          <div className="mt-5">
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#ADADAD]">
              Dev accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEV_ACCOUNTS.map(account => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => handleDevLogin(account)}
                  disabled={devLoading !== null}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[#e8e1de] bg-[#FDFBF7] px-3 py-3 text-center transition-colors hover:border-[#E96B56] hover:bg-[#fdf6f4] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {devLoading === account.label ? (
                    <Spinner />
                  ) : (
                    <span className="text-lg leading-none">
                      {account.label === 'Artist' ? '🎨' : account.label === 'Client' ? '👤' : '🔑'}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-[#1A1A1A]">{account.label}</span>
                  <span className="text-[10px] text-[#ADADAD] leading-tight truncate w-full text-center">
                    {account.email.split('@')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
