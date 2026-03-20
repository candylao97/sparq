'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Eye,
  AlertTriangle,
  Save,
  Loader2,
} from 'lucide-react'

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string
}

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
        enabled ? 'bg-[#E96B56]' : 'bg-[#e8e1de]'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out',
          enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export default function AccountSettingsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Personal info state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Notification prefs (coming soon — not yet persisted)
  const [notifBooking, setNotifBooking] = useState(true)
  const [notifMessages, setNotifMessages] = useState(true)
  const [notifPromotions, setNotifPromotions] = useState(false)

  // Privacy (coming soon — not yet persisted)
  const [showInSearch, setShowInSearch] = useState(true)
  const [allowMessages, setAllowMessages] = useState(true)

  // Deactivation modal
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProfile(data)
      setName(data.name || '')
      setPhone(data.phone || '')
    } catch {
      toast.error('Couldn\'t load your settings — please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router, fetchProfile])

  async function handleSavePersonal() {
    setSavingPersonal(true)
    try {
      const res = await fetch('/api/account-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'personal', name, phone }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      await fetchProfile()
      toast.success('Your details have been saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingPersonal(false)
    }
  }

  async function handleSavePassword() {
    setPasswordError('')

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch('/api/account-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'password', currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated — you\'re all set.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  function handleDeactivateConfirm() {
    setShowDeactivateModal(false)
    toast('Please contact support to deactivate your account', { icon: 'i' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <p className="text-[#717171]">Unable to load settings.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

        {/* Page heading */}
        <h1 className="mb-6 text-2xl font-bold text-[#1A1A1A]">Your account</h1>

        {/* Section 1: Personal Information */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-[#E96B56]" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Personal details</h2>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[#717171] mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#e8e1de] py-2.5 pl-10 pr-3 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-medium text-[#717171] mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                <input
                  type="email"
                  value={profile.email || ''}
                  readOnly
                  className="w-full rounded-lg border border-[#e8e1de] bg-[#f9f2ef] py-2.5 pl-10 pr-3 text-sm text-[#717171] cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#f3ece9] px-1.5 py-0.5 text-[10px] font-medium text-[#717171] uppercase tracking-wider">
                  Read only
                </span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-[#717171] mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 0412 345 678"
                  className="w-full rounded-lg border border-[#e8e1de] py-2.5 pl-10 pr-3 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSavePersonal}
            disabled={savingPersonal}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#E96B56] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#a63a29] disabled:opacity-50"
          >
            {savingPersonal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </button>
        </div>

        {/* Section 2: Change Password */}
        <div className="mt-4 rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-[#E96B56]" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Change Password</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#717171] mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-lg border border-[#e8e1de] py-2.5 pl-10 pr-3 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#717171] mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-[#e8e1de] py-2.5 pl-10 pr-3 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#717171] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-lg border border-[#e8e1de] py-2.5 pl-10 pr-3 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                />
              </div>
            </div>

            {passwordError && (
              <p className="text-xs text-red-600">{passwordError}</p>
            )}
          </div>

          <button
            onClick={handleSavePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#E96B56] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#a63a29] disabled:opacity-50"
          >
            {savingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Update password
          </button>
        </div>

        {/* Section 3: Notification Preferences */}
        <div className="mt-4 rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-[#E96B56]" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Booking updates</p>
                <p className="text-xs text-[#717171]">Stay in the loop on confirmations, reschedules, and cancellations</p>
              </div>
              <ToggleSwitch enabled={notifBooking} onChange={setNotifBooking} />
            </div>

            <div className="border-t border-[#e8e1de]" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Messages</p>
                <p className="text-xs text-[#717171]">Get notified when an artist or client messages you</p>
              </div>
              <ToggleSwitch enabled={notifMessages} onChange={setNotifMessages} />
            </div>

            <div className="border-t border-[#e8e1de]" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Promotions</p>
                <p className="text-xs text-[#717171]">New features, special offers, and curated picks from Sparq</p>
              </div>
              <ToggleSwitch enabled={notifPromotions} onChange={setNotifPromotions} />
            </div>
          </div>

          <p className="mt-4 text-xs text-[#717171]">
            These preferences will be available soon — we&apos;ll keep you posted.
          </p>
        </div>

        {/* Section 4: Privacy */}
        <div className="mt-4 rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-[#E96B56]" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Appear in search results</p>
                <p className="text-xs text-[#717171]">Let potential clients discover your profile</p>
              </div>
              <ToggleSwitch enabled={showInSearch} onChange={setShowInSearch} />
            </div>

            <div className="border-t border-[#e8e1de]" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Open to messages from anyone</p>
                <p className="text-xs text-[#717171]">
                  Receive messages from people you haven&apos;t booked with yet
                </p>
              </div>
              <ToggleSwitch enabled={allowMessages} onChange={setAllowMessages} />
            </div>
          </div>

          <p className="mt-4 text-xs text-[#717171]">
            Privacy controls are coming soon.
          </p>
        </div>

        {/* Section 5: Danger Zone */}
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Close your account</h2>
          </div>

          <p className="text-sm text-[#717171] mb-4">
            Once your account is closed, your profile, bookings, and reviews will be permanently removed.
            This can&apos;t be undone.
          </p>

          <button
            onClick={() => setShowDeactivateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <AlertTriangle className="h-4 w-4" />
            Deactivate account
          </button>
        </div>

        {/* Deactivation Modal */}
        <Modal
          open={showDeactivateModal}
          onClose={() => setShowDeactivateModal(false)}
          title="Deactivate account"
          size="sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm text-[#717171]">
              Are you sure? Your profile, bookings, reviews, and all associated data will be permanently deleted.
              This can&apos;t be reversed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowDeactivateModal(false)}
              className="rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef]"
            >
              Keep my account
            </button>
            <button
              onClick={handleDeactivateConfirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Yes, close my account
            </button>
          </div>
        </Modal>

      </div>
    </div>
  )
}
