'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import UserIcon from 'lucide-react/dist/esm/icons/user'
import MailIcon from 'lucide-react/dist/esm/icons/mail'
import PhoneIcon from 'lucide-react/dist/esm/icons/phone'
import LockIcon from 'lucide-react/dist/esm/icons/lock'
import EyeIcon from 'lucide-react/dist/esm/icons/eye'
import EyeOffIcon from 'lucide-react/dist/esm/icons/eye-off'
import CheckCircle2Icon from 'lucide-react/dist/esm/icons/check-circle-2'
import AlertCircleIcon from 'lucide-react/dist/esm/icons/alert-circle'
import Loader2Icon from 'lucide-react/dist/esm/icons/loader-2'

// ── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  image: string | null
}

type SaveStatus = 'idle' | 'loading' | 'success' | 'error'

interface SectionStatus {
  profile: SaveStatus
  password: SaveStatus
}

interface SectionError {
  profile: string
  password: string
}

// ── Small shared components ──────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#e8e1de] bg-white p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#1A1A1A]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[#717171]">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-[#1A1A1A]">{label}</label>
      {children}
    </div>
  )
}

function InlineFeedback({
  status,
  successMsg,
  errorMsg,
}: {
  status: SaveStatus
  successMsg: string
  errorMsg: string
}) {
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
        <CheckCircle2Icon className="h-4 w-4 flex-shrink-0" />
        {successMsg}
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
        <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
        {errorMsg}
      </div>
    )
  }
  return null
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CustomerSettingsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Status tracking
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    profile: 'idle',
    password: 'idle',
  })
  const [sectionError, setSectionError] = useState<SectionError>({
    profile: '',
    password: '',
  })

  // Auth guard
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login')
    }
  }, [authStatus, router])

  // Load profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error()
      const data: ProfileData = await res.json()
      setProfile(data)
      setName(data.name ?? '')
      setPhone(data.phone ?? '')
    } catch {
      // silently fail — fields will just be empty
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchProfile()
    }
  }, [authStatus, fetchProfile])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    setSectionStatus((s) => ({ ...s, profile: 'loading' }))
    setSectionError((e) => ({ ...e, profile: '' }))

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          phone: phone.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSectionStatus((s) => ({ ...s, profile: 'success' }))
      setTimeout(() => setSectionStatus((s) => ({ ...s, profile: 'idle' })), 3000)
    } catch (err) {
      setSectionError((e) => ({
        ...e,
        profile: err instanceof Error ? err.message : 'Failed to save changes',
      }))
      setSectionStatus((s) => ({ ...s, profile: 'error' }))
    }
  }

  async function handleChangePassword() {
    setSectionError((e) => ({ ...e, password: '' }))

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSectionError((e) => ({ ...e, password: 'All password fields are required' }))
      setSectionStatus((s) => ({ ...s, password: 'error' }))
      return
    }

    if (newPassword.length < 8) {
      setSectionError((e) => ({ ...e, password: 'New password must be at least 8 characters' }))
      setSectionStatus((s) => ({ ...s, password: 'error' }))
      return
    }

    if (newPassword !== confirmPassword) {
      setSectionError((e) => ({ ...e, password: 'New passwords do not match' }))
      setSectionStatus((s) => ({ ...s, password: 'error' }))
      return
    }

    setSectionStatus((s) => ({ ...s, password: 'loading' }))

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change password')
      }

      setSectionStatus((s) => ({ ...s, password: 'success' }))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSectionStatus((s) => ({ ...s, password: 'idle' })), 3000)
    } catch (err) {
      setSectionError((e) => ({
        ...e,
        password: err instanceof Error ? err.message : 'Failed to change password',
      }))
      setSectionStatus((s) => ({ ...s, password: 'error' }))
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (authStatus === 'loading' || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  const avatarInitial = (name || profile?.email || 'C').charAt(0).toUpperCase()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">

        {/* Back link */}
        <Link
          href="/dashboard/customer"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="mb-1 font-headline text-2xl font-bold text-[#1A1A1A]">Account settings</h1>
        <p className="mb-8 text-sm text-[#717171]">Manage your personal info and security preferences.</p>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

          {/* Sidebar — avatar + nav */}
          <div className="flex flex-col gap-4">
            {/* Avatar card */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#e8e1de] bg-white px-6 py-8">
              {profile?.image ? (
                <img
                  src={profile.image}
                  alt={name || 'Profile photo'}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f3ece9] text-2xl font-semibold text-[#E96B56]">
                  {avatarInitial}
                </div>
              )}
              <div className="text-center">
                <p className="font-semibold text-[#1A1A1A]">{name || 'Your name'}</p>
                <p className="text-xs text-[#717171]">{profile?.email}</p>
              </div>
              <p className="text-center text-xs text-[#717171]">
                Photo upload coming soon
              </p>
            </div>

            {/* Quick nav */}
            <div className="hidden rounded-2xl border border-[#e8e1de] bg-white p-4 lg:block">
              <nav className="space-y-1">
                {[
                  { href: '#personal', icon: UserIcon, label: 'Personal info' },
                  { href: '#email', icon: MailIcon, label: 'Email address' },
                  { href: '#phone', icon: PhoneIcon, label: 'Phone number' },
                  { href: '#password', icon: LockIcon, label: 'Change password' },
                ].map(({ href, icon: Icon, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#717171] transition-colors hover:bg-[#f9f2ef] hover:text-[#1A1A1A]"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col gap-6">

            {/* Personal info section */}
            <div id="personal">
              <SectionCard
                title="Personal info"
                description="Update your display name shown to artists when you book."
              >
                <div className="grid gap-5">
                  <FieldRow label="Display name">
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        disabled={sectionStatus.profile === 'loading'}
                        className="w-full rounded-xl border border-[#e8e1de] py-3 pl-10 pr-4 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#717171] focus:border-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </FieldRow>

                  {/* Feedback */}
                  <InlineFeedback
                    status={sectionStatus.profile}
                    successMsg="Changes saved successfully"
                    errorMsg={sectionError.profile || 'Failed to save changes'}
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={sectionStatus.profile === 'loading'}
                      className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-60"
                    >
                      {sectionStatus.profile === 'loading' ? (
                        <>
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        'Save changes'
                      )}
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Email section */}
            <div id="email">
              <SectionCard
                title="Email address"
                description="Your email is used to log in and receive booking notifications."
              >
                <div className="grid gap-5">
                  <FieldRow label="Email address">
                    <div className="relative">
                      <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                      <input
                        type="email"
                        value={profile?.email ?? ''}
                        readOnly
                        className="w-full cursor-default rounded-xl border border-[#e8e1de] bg-[#f9f2ef] py-3 pl-10 pr-4 text-sm text-[#717171] outline-none"
                      />
                    </div>
                  </FieldRow>
                  <p className="rounded-xl bg-[#f9f2ef] px-4 py-3 text-xs text-[#717171]">
                    To change your email address, please{' '}
                    <Link href="/contact" className="font-medium text-[#E96B56] underline-offset-2 hover:underline">
                      contact support
                    </Link>
                    .
                  </p>
                </div>
              </SectionCard>
            </div>

            {/* Phone section */}
            <div id="phone">
              <SectionCard
                title="Phone number"
                description="Your phone number may be shared with artists for appointment coordination."
              >
                <div className="grid gap-5">
                  <FieldRow label="Phone number">
                    <div className="relative">
                      <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+61 4xx xxx xxx"
                        disabled={sectionStatus.profile === 'loading'}
                        className="w-full rounded-xl border border-[#e8e1de] py-3 pl-10 pr-4 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#717171] focus:border-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </FieldRow>

                  {/* Feedback shared with profile save */}
                  <InlineFeedback
                    status={sectionStatus.profile}
                    successMsg="Changes saved successfully"
                    errorMsg={sectionError.profile || 'Failed to save changes'}
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={sectionStatus.profile === 'loading'}
                      className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-60"
                    >
                      {sectionStatus.profile === 'loading' ? (
                        <>
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        'Save changes'
                      )}
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Change password section */}
            <div id="password">
              <SectionCard
                title="Change password"
                description="Choose a strong password that is at least 8 characters long."
              >
                <div className="grid gap-5">

                  <FieldRow label="Current password">
                    <div className="relative">
                      <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                        disabled={sectionStatus.password === 'loading'}
                        className="w-full rounded-xl border border-[#e8e1de] py-3 pl-10 pr-10 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#717171] focus:border-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#1A1A1A]"
                        tabIndex={-1}
                        aria-label={showCurrent ? 'Hide password' : 'Show password'}
                      >
                        {showCurrent ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </FieldRow>

                  <FieldRow label="New password">
                    <div className="relative">
                      <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        disabled={sectionStatus.password === 'loading'}
                        className="w-full rounded-xl border border-[#e8e1de] py-3 pl-10 pr-10 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#717171] focus:border-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#1A1A1A]"
                        tabIndex={-1}
                        aria-label={showNew ? 'Hide password' : 'Show password'}
                      >
                        {showNew ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </FieldRow>

                  <FieldRow label="Confirm new password">
                    <div className="relative">
                      <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        disabled={sectionStatus.password === 'loading'}
                        className="w-full rounded-xl border border-[#e8e1de] py-3 pl-10 pr-10 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#717171] focus:border-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#1A1A1A]"
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </FieldRow>

                  {/* Feedback */}
                  <InlineFeedback
                    status={sectionStatus.password}
                    successMsg="Password changed successfully"
                    errorMsg={sectionError.password || 'Failed to change password'}
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleChangePassword}
                      disabled={sectionStatus.password === 'loading'}
                      className="flex items-center gap-2 rounded-xl bg-[#E96B56] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d45f4b] disabled:opacity-60"
                    >
                      {sectionStatus.password === 'loading' ? (
                        <>
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                          Updating…
                        </>
                      ) : (
                        'Update password'
                      )}
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
