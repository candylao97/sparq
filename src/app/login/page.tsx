'use client'

import { useState, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft, Mail, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

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
    <svg className="h-[18px] w-[18px] flex-shrink-0" viewBox="0 0 24 24">
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

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[18px] font-extrabold tracking-[0.18em] ${dark ? 'text-white' : 'text-sparq-ink'}`}>
      SPARQ<span className="text-sparq-coral">*</span>
    </span>
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
        toast.error(data.error || 'Couldn’t create your account. Please try again.')
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

  const headline =
    step === 'login' ? <>Welcome <em className="font-headline italic text-sparq-coral">back</em></>
    : step === 'signup' ? <>Create your <em className="font-headline italic text-sparq-coral">account</em></>
    : <>Log in or <em className="font-headline italic text-sparq-coral">sign up</em></>

  const subcopy =
    step === 'login' ? 'Enter your password to continue.'
    : step === 'signup' ? 'Choose a password to create your account.'
    : 'Continue with Google, or use your email address.'

  return (
    <div className="grid min-h-screen grid-cols-1 bg-sparq-cream text-sparq-ink lg:grid-cols-[1.05fr_1fr]">

      {/* ── Left: editorial brand stage (desktop only) ── */}
      <aside className="relative hidden flex-col overflow-hidden bg-[#2a2522] p-10 text-white lg:flex">
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 25% 80%, rgba(255,182,170,0.55) 0%, transparent 60%),' +
              'radial-gradient(ellipse 70% 50% at 75% 20%, rgba(255,221,206,0.45) 0%, transparent 55%),' +
              'radial-gradient(ellipse 60% 70% at 80% 95%, rgba(233,107,86,0.55) 0%, transparent 55%),' +
              'linear-gradient(155deg, #E8C8B4 0%, #C49278 38%, #6B4332 72%, #2A1B12 100%)',
          }}
        />
        <div className="relative z-[2]">
          <Brand dark />
        </div>
        <div className="relative z-[2] mt-auto flex flex-col gap-7">
          <div>
            <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              <span className="inline-block h-px w-6 bg-white/50" />
              For clients &amp; artists
            </div>
            <h2 className="max-w-[11ch] font-headline text-[clamp(40px,4.8vw,72px)] font-normal leading-[1.02] tracking-[-0.02em] text-white">
              Book beauty,<br />
              <em className="italic font-normal text-sparq-coral-light">effortlessly<span className="text-sparq-coral">.</span></em>
            </h2>
          </div>
        </div>
      </aside>

      {/* ── Right: auth form ── */}
      <main className="relative flex items-center justify-center bg-sparq-cream px-6 py-12 lg:p-12">

        <div className="absolute left-6 right-6 top-6 flex items-center justify-between lg:hidden">
          <Brand />
        </div>

        <div className="w-full max-w-[420px]">

          {/* email-not-verified banner (TS-2) */}
          {isEmailNotVerified && (
            <div className="mb-5 rounded-xl border border-sparq-coral/30 bg-sparq-coral-light px-4 py-3.5">
              <p className="mb-1 text-sm font-semibold text-sparq-ink">Please verify your email</p>
              <p className="mb-2 text-xs text-[#717171]">Check your inbox for a verification link before signing in.</p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-xs font-semibold text-sparq-coral hover:underline disabled:opacity-50"
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
            </div>
          )}

          <div className="mb-3 flex items-center gap-3">
            {step !== 'email' && (
              <button
                type="button"
                onClick={goBack}
                aria-label="Back"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-sparq-surface-warm"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-sparq-coral-dark">Welcome</span>
          </div>

          <h1 className="mb-2.5 font-headline text-[36px] font-normal leading-[1.05] tracking-[-0.02em]">{headline}</h1>
          <p className="mb-8 max-w-[36ch] text-[15px] text-[#717171]">{subcopy}</p>

          {/* ── STEP 1: email ── */}
          {step === 'email' && (
            <div>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-sparq-border bg-white text-sm font-semibold text-sparq-ink transition-colors hover:border-sparq-ink disabled:opacity-50"
              >
                {googleLoading ? <Spinner /> : <GoogleIcon />}
                Continue with Google
              </button>

              <div className="my-[18px] flex items-center gap-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-sparq-muted">
                <span className="h-px flex-1 bg-sparq-border" />
                or with email
                <span className="h-px flex-1 bg-sparq-border" />
              </div>

              <form onSubmit={handleEmailSubmit}>
                <div className="relative mb-3.5">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder=" "
                    autoComplete="email"
                    autoFocus
                    required
                    className="peer h-14 w-full rounded-[10px] border border-sparq-border bg-white px-[18px] pb-2 pt-[22px] text-[15px] text-sparq-ink transition-[border-color,box-shadow] focus:border-sparq-coral focus:shadow-[0_0_0_3px_rgba(233,107,86,0.18)] focus:outline-none"
                  />
                  <label
                    htmlFor="email"
                    className="pointer-events-none absolute left-[18px] top-[18px] text-[14px] text-sparq-muted transition-all peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-[#717171] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-[#717171]"
                  >
                    Email address
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1.5 flex h-[54px] w-full items-center justify-center gap-2 rounded-[10px] bg-sparq-coral text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(233,107,86,0.22)] transition-colors hover:bg-sparq-coral-dark disabled:opacity-50"
                >
                  {loading && <Spinner light />}
                  Continue
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-[18px] text-center text-xs leading-[1.55] text-sparq-muted">
                By continuing you agree to Sparq&apos;s{' '}
                <Link href="/terms" className="border-b border-sparq-border text-sparq-body hover:border-sparq-ink hover:text-sparq-ink">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="border-b border-sparq-border text-sparq-body hover:border-sparq-ink hover:text-sparq-ink">Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* ── STEP 2: password (login or signup) ── */}
          {(step === 'login' || step === 'signup') && (
            <div>
              <div className="mb-3.5 flex items-center gap-2.5 rounded-[10px] border border-sparq-border bg-sparq-surface-warm px-4 py-3">
                <Mail className="h-4 w-4 flex-shrink-0 text-[#717171]" />
                <span className="flex-1 truncate text-sm">{email}</span>
              </div>

              <form onSubmit={step === 'login' ? handleLogin : handleSignup}>
                <div className="relative mb-3.5">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder=" "
                    autoComplete={step === 'login' ? 'current-password' : 'new-password'}
                    autoFocus
                    required
                    minLength={8}
                    className="peer h-14 w-full rounded-[10px] border border-sparq-border bg-white px-[18px] pb-2 pr-12 pt-[22px] text-[15px] text-sparq-ink transition-[border-color,box-shadow] focus:border-sparq-coral focus:shadow-[0_0_0_3px_rgba(233,107,86,0.18)] focus:outline-none"
                  />
                  <label
                    htmlFor="password"
                    className="pointer-events-none absolute left-[18px] top-[18px] text-[14px] text-sparq-muted transition-all peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-[#717171] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-[#717171]"
                  >
                    {step === 'login' ? 'Password' : 'Create a password (min. 8 characters)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute bottom-3 right-3 text-[#717171] hover:text-sparq-ink"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {step === 'login' && (
                  <div className="mb-1 flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold underline underline-offset-2 hover:text-sparq-coral"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                {step === 'signup' && (
                  <label className="mb-1 flex cursor-pointer select-none items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 rounded border-sparq-border text-sparq-coral focus:ring-sparq-coral"
                      data-testid="tos-consent-checkbox"
                    />
                    <span className="text-[12px] leading-relaxed text-[#717171]">
                      I agree to Sparq&apos;s{' '}
                      <Link href="/terms" className="text-sparq-ink underline underline-offset-2 hover:text-sparq-coral">Terms of Service</Link>
                      {' '}&amp;{' '}
                      <Link href="/privacy" className="text-sparq-ink underline underline-offset-2 hover:text-sparq-coral">Privacy Policy</Link>.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading || (step === 'signup' && !acceptedTerms)}
                  className="mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-[10px] bg-sparq-coral text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(233,107,86,0.22)] transition-colors hover:bg-sparq-coral-dark disabled:opacity-50"
                >
                  {loading && <Spinner light />}
                  {step === 'login' ? 'Log in' : 'Create account'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* dev quick-login strip */}
          {isDev && (
            <div className="mt-5">
              <p className="mb-2 text-center font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-sparq-muted">
                Dev accounts
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEV_ACCOUNTS.map(account => (
                  <button
                    key={account.label}
                    type="button"
                    onClick={() => handleDevLogin(account)}
                    disabled={devLoading !== null}
                    className="flex flex-col items-center gap-1 rounded-[10px] border border-sparq-border bg-white px-3 py-3 text-center transition-colors hover:border-sparq-coral disabled:opacity-40"
                  >
                    {devLoading === account.label ? (
                      <Spinner />
                    ) : (
                      <span className="text-lg leading-none">
                        {account.label === 'Artist' ? '🎨' : account.label === 'Client' ? '👤' : '🔑'}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold">{account.label}</span>
                    <span className="w-full truncate text-center text-[10px] text-sparq-muted">
                      {account.email.split('@')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-sparq-muted lg:absolute lg:bottom-6 lg:left-0 lg:right-0">
            <span>Help</span>
            <span className="h-[3px] w-[3px] rounded-full bg-sparq-muted opacity-50" />
            <span>English (AU)</span>
            <span className="h-[3px] w-[3px] rounded-full bg-sparq-muted opacity-50" />
            <span>© 2026 Sparq</span>
          </div>
        </div>
      </main>
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
