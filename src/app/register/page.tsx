'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ChevronDown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const COUNTRY_CODES = [
  { label: 'Australia (+61)', code: '+61', flag: '🇦🇺' },
  { label: 'United States (+1)', code: '+1', flag: '🇺🇸' },
  { label: 'United Kingdom (+44)', code: '+44', flag: '🇬🇧' },
  { label: 'New Zealand (+64)', code: '+64', flag: '🇳🇿' },
  { label: 'India (+91)', code: '+91', flag: '🇮🇳' },
]

function isValidPhone(value: string): boolean {
  const digits = value.replace(/[\s\-()]/g, '')
  return /^\d{6,15}$/.test(digits)
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'details'>('phone')
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0])
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showCountry, setShowCountry] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const fullPhone = `${countryCode.code}${phone.replace(/^0+/, '')}`

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidPhone(phone)) {
      toast.error('Please enter a valid phone number')
      return
    }
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhone,
          email: showEmail ? email : undefined,
          password,
          role: 'CUSTOMER',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'We couldn\u2019t create your account. Please try again.')
        return
      }
      await signIn('credentials', { identifier: fullPhone, password, redirect: false })
      toast.success('Welcome to Sparq!')
      router.push('/dashboard/customer')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/dashboard/customer' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)] px-4 py-10">
      <div className="w-full max-w-[480px]">
        {/* Card */}
        <div className="rounded-[28px] border border-[#e8e1de] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          {/* Header */}
          <div className="relative border-b border-[#e8e1de] px-6 py-5 text-center">
            {step === 'details' && (
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#1A1A1A]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-base font-semibold text-[#1A1A1A]">Sign up</h1>
          </div>

          <div className="px-6 py-6">
            <h2 className="mb-6 text-2xl font-semibold text-[#1A1A1A]">
              Welcome to <span className="font-display-italic">Sparq</span>
            </h2>

            {step === 'phone' ? (
              <>
                <form onSubmit={handleContinue} className="space-y-4">
                  {/* Country / Region + Phone */}
                  <div className="overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                    {/* Country selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountry(!showCountry)}
                        className="flex w-full items-center justify-between border-b border-[#1A1A1A]/15 px-4 py-3.5 text-left transition-colors hover:bg-[#f9f2ef]"
                      >
                        <div>
                          <p className="text-label text-[#717171]">Country / Region</p>
                          <p className="text-sm font-medium text-[#1A1A1A]">{countryCode.flag} {countryCode.label}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-[#717171] transition-transform ${showCountry ? 'rotate-180' : ''}`} />
                      </button>
                      {showCountry && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowCountry(false)} />
                          <div className="absolute left-0 right-0 top-full z-20 border-b border-[#1A1A1A]/15 bg-white">
                            {COUNTRY_CODES.map(country => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => { setCountryCode(country); setShowCountry(false) }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[#f9f2ef] ${
                                  countryCode.code === country.code ? 'bg-[#f9f2ef] font-medium' : 'text-[#1A1A1A]'
                                }`}
                              >
                                <span>{country.flag}</span>
                                {country.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Phone input */}
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                      autoFocus
                      required
                    />
                  </div>

                  <Button type="submit" fullWidth size="lg">
                    Continue
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
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Show phone */}
                <div className="rounded-xl bg-[#f9f2ef] px-4 py-3">
                  <p className="text-xs text-[#717171]">Signing up with</p>
                  <p className="text-sm font-medium text-[#1A1A1A]">{fullPhone}</p>
                </div>

                {/* Password */}
                <div className="relative overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password (min. 8 characters)"
                    className="w-full px-4 py-3.5 pr-10 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                    autoFocus
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#717171]"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Email (optional, expandable) */}
                {showEmail ? (
                  <div className="overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEmail(true)}
                    className="w-full text-left text-xs text-[#E96B56] hover:underline"
                  >
                    + Add email address
                  </button>
                )}

                <Button type="submit" loading={loading} fullWidth size="lg">
                  Sign up
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Footer links */}
        <p className="mt-5 text-center text-sm text-[#717171]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#E96B56] hover:underline">Log in</Link>
        </p>
        <p className="mt-2 text-center text-sm text-[#717171]">
          Want to list your services?{' '}
          <Link href="/register/provider" className="font-semibold text-[#E96B56] hover:underline">Join as an artist</Link>
        </p>
      </div>
    </div>
  )
}
