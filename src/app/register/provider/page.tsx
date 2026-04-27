'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Minus, Plus, ChevronRight, ArrowLeft, Eye, EyeOff,
  Briefcase, GraduationCap, Award, Sparkles, Brush,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'
import { isValidServiceArea } from '@/lib/address-validation'

const SERVICES = [
  { id: 'NAILS', label: 'Nails', icon: Sparkles },
  { id: 'LASHES', label: 'Lashes', icon: Eye },
  { id: 'MAKEUP', label: 'Makeup', icon: Brush },
]

const ALL_STEPS = ['service', 'location', 'listing', 'experience', 'qualifications'] as const
const AUTH_STEPS = ['service', 'location', 'experience', 'qualifications'] as const
type Step = typeof ALL_STEPS[number]

function getSpecialistLabel(label: string) {
  const map: Record<string, string> = {
    'Nails': 'nail specialist',
    'Lashes': 'lash specialist',
    'Makeup': 'makeup artist',
  }
  return map[label] || 'specialist'
}

export default function ProviderRegisterPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<typeof SERVICES[0] | null>(null)
  const [city, setCity] = useState('')
  const [years, setYears] = useState(1)
  const [loading, setLoading] = useState(false)

  // Account (only used for unauthenticated flow)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  // FIND-4: consent state (only needed on the unauthenticated signup path;
  // authenticated upgrades don't create a new account).
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Qualifications
  const [experienceText, setExperienceText] = useState('')
  const [degreeText, setDegreeText] = useState('')
  const [highlightText, setHighlightText] = useState('')
  const [expandedQual, setExpandedQual] = useState<string | null>(null)

  useEffect(() => {
    const pending = sessionStorage.getItem('sparq_pending_email')
    if (pending) {
      setEmail(pending)
      sessionStorage.removeItem('sparq_pending_email')
    }
  }, [])

  const STEPS = session ? AUTH_STEPS : ALL_STEPS
  const stepIndex = (STEPS as readonly string[]).indexOf(step)
  const aboutStepNum = step === 'experience' ? 1 : step === 'qualifications' ? 2 : 0

  const goNext = () => {
    const i = (STEPS as readonly string[]).indexOf(step)
    if (i < STEPS.length - 1) setStep(STEPS[i + 1] as Step)
  }
  const goBack = () => {
    const i = (STEPS as readonly string[]).indexOf(step)
    if (i > 0) setStep(STEPS[i - 1] as Step)
  }

  const canProceed = () => {
    switch (step) {
      case 'service': return !!selectedService
      // Batch B Item 5: service area must be "Suburb, STATE postcode", e.g.
      // "Point Cook, VIC 3030". Bare suburb names like "Point Cook" are
      // rejected — previously any string of length >= 2 was accepted.
      case 'location': return isValidServiceArea(city)
      // FIND-4: the ToS checkbox is required for the unauthenticated flow
      // where we're about to create a new account. Authenticated upgrades
      // already have consent recorded from their original signup.
      case 'listing': return name.trim().length >= 2
        && phone.trim().length >= 8
        && password.length >= 8
        && (session || acceptedTerms)
      case 'experience': return years >= 1
      case 'qualifications': return true
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      if (session) {
        // Authenticated user: upgrade role instead of creating a new account
        const res = await fetch('/api/user/upgrade-role', { method: 'POST' })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Something went wrong')
          return
        }
        // QA-002: Force the NextAuth JWT to re-read role from DB before we
        // navigate to /dashboard/provider — without this the cached
        // CUSTOMER token would gate the page back to the wrong dashboard.
        await updateSession()
        toast.success('Welcome! Your artist profile is live.')
        router.refresh()
        router.push('/dashboard/provider')
      } else {
        // Unauthenticated user: create a new account
        if (!acceptedTerms) {
          toast.error('Please accept the Terms of Service to continue.')
          return
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            email,
            password,
            role: 'PROVIDER',
            acceptedTerms: true,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Registration failed')
          return
        }
        // Redirect to verify-email page — user must confirm email before signing in
        router.push('/verify-email')
      }
    } finally {
      setLoading(false)
    }
  }

  // Display name for the qualifications avatar
  const displayName = session?.user?.name || name

  // Preview card for location and listing steps
  const PreviewCard = () => (
    <div className="rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-lg w-56">
      <div className="mb-4 flex h-28 items-center justify-center rounded-xl bg-[#f9f2ef]">
        {selectedService && <selectedService.icon className="h-14 w-14 text-[#717171]" />}
      </div>
      <p className="text-center text-base font-bold text-[#1A1A1A]">{selectedService?.label}</p>
      {city && <p className="mt-1 text-center text-sm text-[#717171]">{city}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white">
      {/* Top bar */}
      {aboutStepNum > 0 ? (
        <div className="flex items-center justify-between border-b border-[#e8e1de] px-6 py-4">
          <div />
          <div className="text-center">
            <span className="font-headline text-sm font-semibold text-[#1A1A1A]">About you</span>
            <span className="ml-2 text-sm text-[#717171]">Step {aboutStepNum} of 2</span>
          </div>
          <Link href="/" className="rounded-full border border-[#1A1A1A]/15 px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#f9f2ef]">
            Save and exit
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-[#e8e1de] px-6 py-4">
          <Link href="/" className="text-sm font-medium text-[#717171] hover:text-[#1A1A1A]">
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to home
          </Link>
          <div />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">

        {/* Step 1: Service Selection */}
        {step === 'service' && (
          <div className="w-full max-w-4xl">
            <h1 className="font-headline mb-10 text-center text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
              Which service will<br />you provide?
            </h1>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {SERVICES.map(service => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service)}
                  className={`flex flex-col items-center rounded-2xl border-2 p-5 transition-all hover:shadow-md ${
                    selectedService?.id === service.id
                      ? 'border-[#E96B56] bg-[#f9f2ef] shadow-md'
                      : 'border-[#e8e1de] bg-white hover:border-[#E96B56]/40'
                  }`}
                >
                  <service.icon className="mb-3 h-10 w-10 text-[#717171]" />
                  <span className="text-sm font-semibold text-[#1A1A1A]">{service.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 'location' && (
          <div className="flex w-full max-w-4xl items-center justify-between gap-16">
            <div className="flex-1">
              <h1 className="font-headline mb-8 text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
                Where will you<br />offer your service?
              </h1>
              <div className="max-w-md">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#717171]" />
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Point Cook, VIC 3030"
                    className="w-full rounded-xl border border-[#1A1A1A]/15 py-4 pl-12 pr-4 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-[#717171]">
                  Format: suburb, state, and 4-digit postcode — e.g. <span className="font-medium text-[#1A1A1A]">Bondi, NSW 2026</span>.
                </p>
              </div>
            </div>
            <div className="hidden lg:block">
              <PreviewCard />
            </div>
          </div>
        )}

        {/* Step 3: Create Listing (unauthenticated only) */}
        {step === 'listing' && !session && (
          <div className="flex w-full max-w-4xl items-start justify-between gap-16">
            <div className="flex-1 max-w-md">
              <h1 className="font-headline mb-3 text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
                Create your listing
              </h1>
              <p className="mb-8 text-base text-[#717171]">
                Tell us about you and the service you offer. We&apos;ll review your listing to confirm it meets our requirements.
              </p>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                    required
                  />
                </div>
                <div className="overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                    required
                  />
                </div>
                <div className="overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
                  />
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[#1A1A1A]/15">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password (min. 8 characters)"
                    className="w-full px-4 py-3.5 pr-10 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none"
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
                {/* FIND-4: required ToS consent on artist signup. Authenticated
                    upgrades skip this step entirely (session branch in canProceed). */}
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
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
              </div>
            </div>
            <div className="hidden lg:block">
              <PreviewCard />
            </div>
          </div>
        )}

        {/* Step 4: Years of Experience */}
        {step === 'experience' && (
          <div className="text-center">
            <h1 className="font-headline mb-12 text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
              How many years have you<br />been a {getSpecialistLabel(selectedService?.label || '')}?
            </h1>
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setYears(Math.max(1, years - 1))}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1A1A1A]/15 text-[#717171] transition-colors hover:border-[#E96B56] hover:text-[#E96B56] disabled:opacity-30"
                disabled={years <= 1}
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="min-w-[80px] text-7xl font-bold text-[#1A1A1A]">{years}</span>
              <button
                type="button"
                onClick={() => setYears(Math.min(50, years + 1))}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1A1A1A]/15 text-[#717171] transition-colors hover:border-[#E96B56] hover:text-[#E96B56]"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Qualifications */}
        {step === 'qualifications' && (
          <div className="w-full max-w-lg text-center">
            <div className="mx-auto mb-6">
              <Avatar name={displayName} size="xl" />
            </div>
            <h1 className="font-headline mb-2 text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
              {session?.user?.name
                ? `Almost there, ${session.user.name.split(' ')[0]}.`
                : 'Share your qualifications'}
            </h1>
            <p className="mb-10 text-base text-[#717171]">Help clients get to know you.</p>

            <div className="space-y-3 text-left">
              {/* Experience */}
              <button
                type="button"
                onClick={() => setExpandedQual(expandedQual === 'experience' ? null : 'experience')}
                className="flex w-full items-center gap-4 rounded-2xl border border-[#e8e1de] p-5 text-left transition-colors hover:bg-[#f9f2ef]"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#f3ece9]">
                  <Briefcase className="h-5 w-5 text-[#717171]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1A1A]">Experience</p>
                  <p className="text-sm text-[#717171]">
                    {experienceText || 'Add your most notable job'}
                  </p>
                </div>
                <ChevronRight className={`h-5 w-5 text-[#717171] transition-transform ${expandedQual === 'experience' ? 'rotate-90' : ''}`} />
              </button>
              {expandedQual === 'experience' && (
                <div className="ml-16 mr-4">
                  <textarea
                    value={experienceText}
                    onChange={e => setExperienceText(e.target.value)}
                    placeholder="e.g. 5 years at a top salon in Sydney..."
                    rows={3}
                    className="w-full rounded-xl border border-[#1A1A1A]/15 px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56]"
                    autoFocus
                  />
                </div>
              )}

              {/* Degree */}
              <button
                type="button"
                onClick={() => setExpandedQual(expandedQual === 'degree' ? null : 'degree')}
                className="flex w-full items-center gap-4 rounded-2xl border border-[#e8e1de] p-5 text-left transition-colors hover:bg-[#f9f2ef]"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#f3ece9]">
                  <GraduationCap className="h-5 w-5 text-[#717171]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1A1A]">Degree</p>
                  <p className="text-sm text-[#717171]">
                    {degreeText || 'Add your degree or training'}
                  </p>
                </div>
                <ChevronRight className={`h-5 w-5 text-[#717171] transition-transform ${expandedQual === 'degree' ? 'rotate-90' : ''}`} />
              </button>
              {expandedQual === 'degree' && (
                <div className="ml-16 mr-4">
                  <textarea
                    value={degreeText}
                    onChange={e => setDegreeText(e.target.value)}
                    placeholder="e.g. Certificate III in Beauty Services..."
                    rows={3}
                    className="w-full rounded-xl border border-[#1A1A1A]/15 px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56]"
                    autoFocus
                  />
                </div>
              )}

              {/* Career highlight */}
              <button
                type="button"
                onClick={() => setExpandedQual(expandedQual === 'highlight' ? null : 'highlight')}
                className="flex w-full items-center gap-4 rounded-2xl border border-[#e8e1de] p-5 text-left transition-colors hover:bg-[#f9f2ef]"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#f3ece9]">
                  <Award className="h-5 w-5 text-[#717171]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1A1A]">Career highlight <span className="font-normal text-[#717171]">(optional)</span></p>
                  <p className="text-sm text-[#717171]">
                    {highlightText || 'Add any honours or media features'}
                  </p>
                </div>
                <ChevronRight className={`h-5 w-5 text-[#717171] transition-transform ${expandedQual === 'highlight' ? 'rotate-90' : ''}`} />
              </button>
              {expandedQual === 'highlight' && (
                <div className="ml-16 mr-4">
                  <textarea
                    value={highlightText}
                    onChange={e => setHighlightText(e.target.value)}
                    placeholder="e.g. Featured in Vogue Australia..."
                    rows={3}
                    className="w-full rounded-xl border border-[#1A1A1A]/15 px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#717171] outline-none focus:border-[#E96B56]"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="border-t border-[#e8e1de] px-6 py-4">
        {/* Progress bar */}
        <div className="mx-auto mb-4 h-1 max-w-4xl overflow-hidden rounded-full bg-[#f3ece9]">
          <div
            className="h-full rounded-full bg-[#E96B56] transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="text-sm font-semibold text-[#1A1A1A] underline hover:no-underline"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 'qualifications' ? (
            <Button
              onClick={handleFinish}
              loading={loading}
              size="lg"
              className="!rounded-xl !bg-[#E96B56] !px-8 !text-white hover:!bg-[#d45a45]"
            >
              Finish
            </Button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="rounded-xl bg-[#E96B56] px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#d45a45] disabled:opacity-30"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
