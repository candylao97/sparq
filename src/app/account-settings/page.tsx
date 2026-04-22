'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

import {
  User as UserIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Bell as BellIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  AlertTriangle as AlertTriangleIcon,
  ChevronLeft as ChevronLeftIcon,
  CheckCircle2 as CheckCircle2Icon,
  Check as CheckIcon,
  Shield as ShieldIcon,
  Camera as CameraIcon,
  Link as LinkIcon,
  LogOut as LogOutIcon,
  CreditCard as CreditCardIcon,
  HelpCircle as HelpCircleIcon,
  ExternalLink as ExternalLinkIcon,
  ShieldCheck as ShieldCheckIcon,
  MessageSquare as MessageSquareIcon,
  Plus as PlusIcon,
  FileText as FileTextIcon,
  Users as UsersIcon,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  image: string | null
  role: string
}

type SectionId =
  | 'personal'
  | 'security'
  | 'notifications'
  | 'privacy'
  | 'payments'
  | 'help'

// ── Navigation config ──────────────────────────────────────────────────────

interface NavItem {
  id: SectionId
  label: string
  Icon: React.FC<{ className?: string }>
  danger?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Account',
    items: [
      { id: 'personal', label: 'Personal info', Icon: UserIcon },
      { id: 'security', label: 'Login & security', Icon: ShieldIcon },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { id: 'notifications', label: 'Notifications', Icon: BellIcon },
      { id: 'privacy', label: 'Privacy', Icon: EyeIcon },
    ],
  },
  {
    label: 'Billing',
    items: [{ id: 'payments', label: 'Payments', Icon: CreditCardIcon }],
  },
  {
    label: 'Support',
    items: [{ id: 'help', label: 'Help & safety', Icon: HelpCircleIcon }],
  },
]

const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
]

// ── Shared primitives ──────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
  ariaLabel,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E96B56] focus-visible:ring-offset-2',
        enabled ? 'bg-[#E96B56]' : 'bg-[#e8e1de]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow ring-0 transition-transform duration-200',
          enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function SettingsInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  readOnly,
  Icon,
  rightSlot,
  error,
}: {
  id?: string
  type?: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  Icon?: React.FC<{ className?: string }>
  rightSlot?: React.ReactNode
  error?: string
}) {
  return (
    <div>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717171]" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={cn(
            'w-full rounded-xl border py-3 text-sm outline-none transition-all',
            Icon ? 'pl-10' : 'pl-4',
            rightSlot ? 'pr-12' : 'pr-4',
            readOnly
              ? 'cursor-default border-[#e8e1de] bg-[#f9f2ef] text-[#717171]'
              : error
                ? 'border-red-400 bg-white text-[#1A1A1A] focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-[#e8e1de] bg-white text-[#1A1A1A] focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]',
          )}
        />
        {rightSlot && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  error,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <SettingsInput
      id={id}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      Icon={LockIcon}
      error={error}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      }
    />
  )
}

// ── Password strength ──────────────────────────────────────────────────────

function analysePassword(pw: string) {
  const checks = {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length as 0 | 1 | 2 | 3 | 4
  const meta = {
    0: { label: '', bar: 'bg-[#e8e1de]', text: 'text-[#717171]' },
    1: { label: 'Weak', bar: 'bg-red-400', text: 'text-red-600' },
    2: { label: 'Fair', bar: 'bg-orange-400', text: 'text-orange-600' },
    3: { label: 'Good', bar: 'bg-amber-400', text: 'text-amber-600' },
    4: { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600' },
  }[score]
  return { checks, score, ...meta }
}

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const { checks, score, bar, label, text } = analysePassword(password)
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-300',
                i < score ? bar : 'bg-[#e8e1de]',
              )}
            />
          ))}
        </div>
        {label && (
          <span className={cn('w-12 text-right text-xs font-medium', text)}>{label}</span>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {(
          [
            ['length', '8+ characters'],
            ['uppercase', 'Uppercase letter'],
            ['number', 'Number'],
            ['special', 'Special character'],
          ] as [keyof typeof checks, string][]
        ).map(([key, lbl]) => (
          <li key={key} className="flex items-center gap-1.5">
            {checks[key] ? (
              <CheckIcon className="h-3 w-3 shrink-0 text-emerald-500" />
            ) : (
              <div className="h-3 w-3 shrink-0 rounded-full border border-[#d8d1ce]" />
            )}
            <span className={cn('text-xs', checks[key] ? 'text-emerald-600' : 'text-[#717171]')}>
              {lbl}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Verified badge ─────────────────────────────────────────────────────────

function VerifiedBadge({ label = 'Verified' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <CheckCircle2Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// ── Section card ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  subtitle,
  children,
  danger,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  danger?: boolean
  action?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]',
        danger ? 'border-red-200 bg-red-50/50' : 'border-[#e8e1de] bg-white',
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between gap-4 border-b px-6 py-[18px]',
          danger ? 'border-red-100' : 'border-[#f3ece9]',
        )}
      >
        <div>
          <h2 className={cn('text-[15px] font-semibold leading-snug', danger ? 'text-red-900' : 'text-[#1A1A1A]')}>
            {title}
          </h2>
          {subtitle && (
            <p className={cn('mt-0.5 text-xs leading-relaxed', danger ? 'text-red-700' : 'text-[#717171]')}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

// ── Toggle row ─────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  divider,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (v: boolean) => void
  divider?: boolean
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-6 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#717171]">{description}</p>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onChange} ariaLabel={label} />
      </div>
      {divider && <hr className="border-[#f3ece9]" />}
    </>
  )
}

// ── InfoRow (Airbnb-style per-field row) ───────────────────────────────────
// renderEdit receives an `onDone` callback; when undefined the row is read-only

function InfoRow({
  label,
  display,
  renderEdit,
}: {
  label: string
  display: React.ReactNode
  renderEdit?: (onDone: () => void) => React.ReactNode
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="border-b border-[#f3ece9] last:border-0">
      {!editing ? (
        <div className="group -mx-2 flex items-start justify-between gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-[#faf7f5]">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-[#717171]">
              {label}
            </p>
            <div className="text-sm text-[#1A1A1A]">{display}</div>
          </div>
          {renderEdit !== undefined && (
            <button
              onClick={() => setEditing(true)}
              className="mt-0.5 shrink-0 text-sm font-semibold underline underline-offset-2 text-[#1A1A1A] transition-colors hover:text-[#E96B56]"
            >
              Edit
            </button>
          )}
        </div>
      ) : (
        <div className="py-4">
          {renderEdit?.(() => setEditing(false))}
        </div>
      )}
    </div>
  )
}

// ── Inline edit forms (used inside InfoRow render props) ───────────────────

function NameEditForm({
  profile,
  onRefresh,
  onDone,
}: {
  profile: ProfileData
  onRefresh: () => Promise<void>
  onDone: () => void
}) {
  const [name, setName] = useState(profile.name ?? '')
  const [saving, setSaving] = useState(false)
  const isDirty = name.trim() !== (profile.name ?? '').trim()

  async function save() {
    if (!isDirty) return
    setSaving(true)
    try {
      const res = await fetch('/api/account-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'personal', name: name.trim() }),
      })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        throw new Error(d.error ?? 'Could not save')
      }
      await onRefresh()
      toast.success('Name updated.')
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#717171]">
        Full name
      </p>
      <SettingsInput
        value={name}
        onChange={setName}
        placeholder="Your full name"
        Icon={UserIcon}
      />
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          onClick={() => { setName(profile.name ?? ''); onDone() }}
          className="text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          Cancel
        </button>
        <Button size="sm" disabled={!isDirty || saving} loading={saving} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  )
}

function PhoneEditForm({
  profile,
  onRefresh,
  onDone,
}: {
  profile: ProfileData
  onRefresh: () => Promise<void>
  onDone: () => void
}) {
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)
  const isDirty = phone.trim() !== (profile.phone ?? '').trim()

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/account-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'personal', phone: phone.trim() }),
      })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        throw new Error(d.error ?? 'Could not save')
      }
      await onRefresh()
      toast.success('Phone number updated.')
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#717171]">
        Phone number
      </p>
      <SettingsInput
        type="tel"
        value={phone}
        onChange={setPhone}
        placeholder="e.g. 0412 345 678"
        Icon={PhoneIcon}
      />
      <p className="mt-1.5 text-xs text-[#717171]">
        Used for appointment reminders only. Never shown publicly.
      </p>
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          onClick={() => { setPhone(profile.phone ?? ''); onDone() }}
          className="text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          Cancel
        </button>
        <Button size="sm" loading={saving} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  )
}

// ── Section: Personal info ─────────────────────────────────────────────────

function PersonalInfoSection({
  profile,
  onRefresh,
}: {
  profile: ProfileData
  onRefresh: () => Promise<void>
}) {
  const [name, setName] = useState(profile.name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const initials = (profile.name || profile.email || '?')
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isDirty =
    name.trim() !== (profile.name ?? '').trim() ||
    phone.trim() !== (profile.phone ?? '').trim() ||
    title !== ''

  function discard() {
    setName(profile.name ?? '')
    setPhone(profile.phone ?? '')
    setTitle('')
  }

  async function save() {
    setSaving(true)
    try {
      const updates: Record<string, string> = {}
      if (name.trim() !== (profile.name ?? '').trim()) updates.name = name.trim()
      if (phone.trim() !== (profile.phone ?? '').trim()) updates.phone = phone.trim()
      if (Object.keys(updates).length > 0) {
        const res = await fetch('/api/account-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'personal', ...updates }),
        })
        if (!res.ok) {
          const d = (await res.json()) as { error?: string }
          throw new Error(d.error ?? 'Could not save')
        }
        await onRefresh()
      }
      toast.success('Changes saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-14">
      {/* ── Hero heading ── */}
      <section>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-[#1A1A1A] mb-3 sm:text-5xl">
          Personal Information
        </h1>
        <p className="text-sm text-[#717171] max-w-xl leading-relaxed">
          Update your personal details and how others see you on the platform. These changes will be reflected across your public profile and booking system.
        </p>
      </section>

      {/* ── Profile photo ── */}
      <section className="flex flex-col sm:flex-row items-center gap-8">
        <div className="relative group flex-shrink-0">
          <div className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-[#e8e1de] shadow-md">
            {profile.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.image}
                alt={profile.name ?? 'Profile'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-[#f3ece9] flex items-center justify-center">
                <span className="font-headline text-3xl font-semibold text-[#E96B56]">
                  {initials}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => toast('Photo upload coming soon!', { icon: '📸' })}
            className="absolute bottom-1 right-1 bg-[#E96B56] text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform"
            aria-label="Edit profile photo"
          >
            <CameraIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Profile Photo</h3>
          <p className="text-sm text-[#717171] mb-4">JPG, GIF or PNG. Max size of 800K</p>
          <div className="flex gap-4 justify-center sm:justify-start">
            <button
              onClick={() => toast('Photo upload coming soon!', { icon: '📸' })}
              className="px-5 py-2 bg-[#E96B56] text-white rounded-xl text-sm font-bold hover:bg-[#a63a29] transition-colors"
            >
              Edit photo
            </button>
            <button
              onClick={() => toast('Photo removed.', { icon: '🗑️' })}
              className="text-[#E96B56] text-sm font-bold hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      </section>

      {/* ── Form grid ── */}
      <section className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="flex flex-col">
            <label className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#717171]">
              Full Name
            </label>
            <div className="rounded-t-xl bg-[#f3ece9] px-4 py-3.5 border-b-2 border-[#e8e1de] focus-within:border-[#E96B56] transition-colors">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-[#1A1A1A]"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#717171]">
              Email Address
            </label>
            <div className="rounded-t-xl bg-[#f9f2ef] px-4 py-3.5 border-b-2 border-[#e8e1de] flex items-center justify-between gap-3">
              <input
                type="email"
                value={profile.email ?? ''}
                readOnly
                className="min-w-0 flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-[#717171] cursor-default"
              />
              <VerifiedBadge />
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col">
            <label className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#717171]">
              Phone Number
            </label>
            <div className="rounded-t-xl bg-[#f3ece9] px-4 py-3.5 border-b-2 border-[#e8e1de] focus-within:border-[#E96B56] transition-colors">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0412 345 678"
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-[#1A1A1A] placeholder:text-[#b0a8a4]"
              />
            </div>
          </div>

          {/* Professional Title */}
          <div className="flex flex-col">
            <label className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#717171]">
              Professional Title
            </label>
            <div className="rounded-t-xl bg-[#f3ece9] px-4 py-3.5 border-b-2 border-[#e8e1de] focus-within:border-[#E96B56] transition-colors">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Makeup Artist"
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-[#1A1A1A] placeholder:text-[#b0a8a4]"
              />
            </div>
          </div>
        </div>

        {/* Save / Discard */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            onClick={discard}
            className="px-7 py-2.5 text-[#717171] font-bold text-sm rounded-xl hover:bg-[#f3ece9] transition-colors"
          >
            Discard Changes
          </button>
          <button
            onClick={save}
            disabled={!isDirty || saving}
            className="px-7 py-2.5 bg-[#E96B56] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#a63a29] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* Note about email */}
      <p className="text-xs text-[#717171]">
        To change your email address, please{' '}
        <Link href="/contact" className="font-medium underline underline-offset-2 hover:text-[#1A1A1A]">
          contact support
        </Link>
        .
      </p>

    </div>
  )
}

// ── Section: Login & Security ──────────────────────────────────────────────

function SecuritySection({ profile }: { profile: ProfileData }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [success, setSuccess] = useState(false)

  const canSubmit = current && next && confirm && !saving
  const mismatch = confirm.length > 0 && next !== confirm

  function validate() {
    const e: typeof errors = {}
    if (!current) e.current = 'Enter your current password'
    const { score } = analysePassword(next)
    if (next.length < 8) e.next = 'Must be at least 8 characters'
    else if (score < 2) e.next = 'Choose a stronger password'
    if (next !== confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleUpdate() {
    if (!validate()) return
    setSaving(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/account-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'password',
          currentPassword: current,
          newPassword: next,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setCurrent('')
      setNext('')
      setConfirm('')
      setErrors({})
      setSuccess(true)
      toast.success("Password updated — you're all set.")
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('incorrect')) {
        setErrors({ current: 'Current password is incorrect' })
      } else {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Login methods */}
      <SectionCard
        title="Login methods"
        subtitle="How you currently sign in to your account."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-[#e8e1de] bg-[#faf7f5] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E96B56]/10">
                <MailIcon className="h-4 w-4 text-[#E96B56]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Email & password</p>
                <p className="text-xs text-[#717171]">{profile.email}</p>
              </div>
            </div>
            <VerifiedBadge label="Active" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-dashed border-[#e8e1de] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3ece9]">
                <span className="text-sm font-bold text-[#717171]">G</span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Google</p>
                <p className="text-xs text-[#717171]">Not connected</p>
              </div>
            </div>
            <button
              onClick={() => toast('Google login coming soon!', { icon: '🔗' })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E96B56] transition-colors hover:text-[#a63a29]"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Connect
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Change password */}
      <SectionCard
        title="Change password"
        subtitle="Choose a strong, unique password to keep your account safe."
      >
        {success && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2Icon className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-700">
              Password updated. All other sessions have been signed out.
            </p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label htmlFor="pw-current" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#717171]">
              Current password
            </label>
            <PasswordInput
              id="pw-current"
              value={current}
              onChange={(v) => {
                setCurrent(v)
                setErrors((e) => ({ ...e, current: undefined }))
              }}
              placeholder="Enter your current password"
              error={errors.current}
            />
          </div>

          <div>
            <label htmlFor="pw-next" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#717171]">
              New password
            </label>
            <PasswordInput
              id="pw-next"
              value={next}
              onChange={(v) => {
                setNext(v)
                setErrors((e) => ({ ...e, next: undefined }))
              }}
              placeholder="Create a strong password"
              error={errors.next}
            />
            <PasswordStrengthMeter password={next} />
          </div>

          <div>
            <label htmlFor="pw-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#717171]">
              Confirm new password
            </label>
            <PasswordInput
              id="pw-confirm"
              value={confirm}
              onChange={(v) => {
                setConfirm(v)
                setErrors((e) => ({ ...e, confirm: undefined }))
              }}
              placeholder="Re-enter your new password"
              error={errors.confirm ?? (mismatch ? 'Passwords do not match' : undefined)}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() =>
              toast('This will sign you out of all other devices.', { icon: 'ℹ️' })
            }
            className="inline-flex items-center gap-1.5 text-xs text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            <LogOutIcon className="h-3.5 w-3.5" />
            Sign out of all other devices
          </button>
          <Button size="sm" disabled={!canSubmit} loading={saving} onClick={handleUpdate}>
            Update password
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Section: Notifications ─────────────────────────────────────────────────

// P0-1: Notification preferences are now persisted via /api/account-settings/notification-preferences.
// Keys map to the DEFAULT_PREFS structure defined in that route.
function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    emailBookingConfirmation: true,
    emailBookingReminder: true,
    pushNewMessage: true,
    emailMarketing: false,
  })
  const [savedPrefs, setSavedPrefs] = useState({ ...prefs })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/account-settings/notification-preferences')
      .then(r => r.json())
      .then(data => {
        if (data.preferences) {
          const p = {
            emailBookingConfirmation: data.preferences.emailBookingConfirmation ?? true,
            emailBookingReminder: data.preferences.emailBookingReminder ?? true,
            pushNewMessage: data.preferences.pushNewMessage ?? true,
            emailMarketing: data.preferences.emailMarketing ?? false,
          }
          setPrefs(p)
          setSavedPrefs(p)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isDirty =
    prefs.emailBookingConfirmation !== savedPrefs.emailBookingConfirmation ||
    prefs.emailBookingReminder !== savedPrefs.emailBookingReminder ||
    prefs.pushNewMessage !== savedPrefs.pushNewMessage ||
    prefs.emailMarketing !== savedPrefs.emailMarketing

  async function save() {
    setSaving(true)
    setSaved(false)
    // P0-1: Optimistic update — apply locally before server confirms
    setSavedPrefs({ ...prefs })
    try {
      const res = await fetch('/api/account-settings/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      toast.success('Notification preferences saved.')
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // Roll back optimistic update
      setSavedPrefs(savedPrefs)
      toast.error('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-[#f9f2ef]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Email notifications"
        subtitle="Choose what you hear from us and when."
      >
        <div className="space-y-5">
          <ToggleRow
            label="Booking updates"
            description="Confirmations, reschedules, and cancellations for your appointments."
            enabled={prefs.emailBookingConfirmation}
            onChange={v => setPrefs(p => ({ ...p, emailBookingConfirmation: v }))}
            divider
          />
          <ToggleRow
            label="Appointment reminders"
            description="A heads-up 24 hours before each appointment."
            enabled={prefs.emailBookingReminder}
            onChange={v => setPrefs(p => ({ ...p, emailBookingReminder: v }))}
            divider
          />
          <ToggleRow
            label="Messages"
            description="Notifications when an artist sends you a message."
            enabled={prefs.pushNewMessage}
            onChange={v => setPrefs(p => ({ ...p, pushNewMessage: v }))}
            divider
          />
          <ToggleRow
            label="Promotions & offers"
            description="Curated picks, new artists, and occasional Sparq deals."
            enabled={prefs.emailMarketing}
            onChange={v => setPrefs(p => ({ ...p, emailMarketing: v }))}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#f3ece9] pt-5">
          <p className="text-xs text-[#717171]">
            You&apos;ll always receive critical account and security emails.
          </p>
          {saved && !isDirty ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckIcon className="h-4 w-4" /> Saved
            </span>
          ) : isDirty ? (
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Section: Privacy ───────────────────────────────────────────────────────

function PrivacySection() {
  const [shareHistory, setShareHistory] = useState(false)
  const [dataImprovement, setDataImprovement] = useState(true)
  const [saving, setSaving] = useState(false)

  const [original] = useState({ shareHistory: false, dataImprovement: true })
  const isDirty =
    shareHistory !== original.shareHistory || dataImprovement !== original.dataImprovement

  async function save() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    toast.success('Privacy preferences saved.')
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Privacy & Data"
        subtitle="Control how your information is used on Sparq."
      >
        <div className="space-y-5">
          <ToggleRow
            label="Share booking history with artists"
            description="Lets artists you book with see your visit history to personalise your experience."
            enabled={shareHistory}
            onChange={setShareHistory}
            divider
          />
          <ToggleRow
            label="Help improve Sparq"
            description="Allow anonymised usage data to improve product features. Never sold to third parties."
            enabled={dataImprovement}
            onChange={setDataImprovement}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#f3ece9] pt-5">
          <p className="text-xs text-[#717171]">
            We never sell your data. Read our{' '}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-[#1A1A1A]"
            >
              Privacy Policy
            </Link>
            .
          </p>
          {isDirty && (
            <Button size="sm" loading={saving} onClick={save}>
              Save
            </Button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

// ── Section: Payments ──────────────────────────────────────────────────────

function PaymentsSection() {
  return (
    <div className="space-y-4">
      {/* Payment methods */}
      <SectionCard
        title="Payment methods"
        subtitle="Cards saved for faster checkout."
        action={
          <button
            onClick={() => toast('Payment methods are managed at checkout.', { icon: '💳' })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8e1de] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1A1A] shadow-sm transition-colors hover:bg-[#faf7f5]"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add card
          </button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f9f2ef]">
            <CreditCardIcon className="h-5 w-5 text-[#E96B56]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">No payment methods saved</p>
            <p className="mt-1 text-xs text-[#717171]">
              Add a card to book faster — no more re-entering details.
            </p>
          </div>
          <button
            onClick={() => toast('Payment methods are managed at checkout.', { icon: '💳' })}
            className="mt-1 inline-flex items-center gap-2 rounded-xl border border-[#e8e1de] bg-white px-4 py-2.5 text-sm font-medium text-[#1A1A1A] shadow-sm transition-colors hover:bg-[#faf7f5]"
          >
            <PlusIcon className="h-4 w-4" />
            Add a card
          </button>
        </div>
      </SectionCard>

      {/* Billing history */}
      <SectionCard
        title="Booking receipts"
        subtitle="Download receipts for all completed appointments."
      >
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f9f2ef]">
            <FileTextIcon className="h-5 w-5 text-[#717171]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">No receipts yet</p>
            <p className="mt-1 text-xs text-[#717171]">
              Receipts appear here after your first completed booking.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-[#faf7f5] px-5 py-4">
        <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-xs leading-relaxed text-[#717171]">
          All payment information is encrypted and processed securely through{' '}
          <span className="font-medium text-[#1A1A1A]">Stripe</span>. Sparq never stores your
          full card details.
        </p>
      </div>
    </div>
  )
}

// ── Section: Help & Safety ─────────────────────────────────────────────────

function HelpSection() {
  const links: {
    label: string
    desc: string
    href: string
    Icon: React.FC<{ className?: string }>
  }[] = [
    {
      label: 'Help Centre',
      desc: 'Answers to common questions about bookings and accounts',
      href: '/about',
      Icon: HelpCircleIcon,
    },
    {
      label: 'Contact Support',
      desc: 'Get in touch with our team — we respond within 24 hours',
      href: '/contact',
      Icon: MessageSquareIcon,
    },
    {
      label: 'Trust & Safety',
      desc: 'How we verify artists and keep clients safe',
      href: '/trust',
      Icon: ShieldCheckIcon,
    },
    {
      label: 'Community Guidelines',
      desc: 'Standards for artists and clients on Sparq',
      href: '/community',
      Icon: UsersIcon,
    },
  ]

  return (
    <div className="space-y-4">
      <SectionCard
        title="Help & support"
        subtitle="Resources to help you get the most out of Sparq."
      >
        <div className="-mx-2">
          {links.map(({ label, desc, href, Icon }, i) => (
            <Link
              key={label}
              href={href}
              className={cn(
                'group flex items-center justify-between rounded-xl px-4 py-3.5 transition-colors hover:bg-[#faf7f5]',
                i < links.length - 1 && 'border-b border-[#f3ece9]',
              )}
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3ece9] transition-colors group-hover:bg-[#fce9e6]">
                  <Icon className="h-4 w-4 text-[#717171] transition-colors group-hover:text-[#E96B56]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
                  <p className="mt-0.5 text-xs text-[#717171]">{desc}</p>
                </div>
              </div>
              <ExternalLinkIcon className="h-4 w-4 shrink-0 text-[#d8d1ce] transition-colors group-hover:text-[#717171]" />
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* Emergency contact */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-xs font-semibold text-amber-900">
            Urgent safety concern?
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
            If you feel unsafe or want to report a serious incident, email{' '}
            <a
              href="mailto:safety@sparq.com.au"
              className="font-medium underline underline-offset-2"
            >
              safety@sparq.com.au
            </a>{' '}
            or call{' '}
            <a href="tel:1800000000" className="font-medium underline underline-offset-2">
              1800 000 000
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Section: Danger Zone ───────────────────────────────────────────────────

function DangerZoneSection() {
  const [showModal, setShowModal] = useState(false)

  function handleConfirm() {
    setShowModal(false)
    toast('Contact support at help@sparq.com.au to close your account.', {
      icon: 'ℹ️',
      duration: 6000,
    })
  }

  return (
    <>
      <SectionCard
        title="Close account"
        subtitle="Permanently remove your account and all associated data."
        danger
      >
        <p className="mb-5 text-sm leading-relaxed text-red-800/80">
          Once your account is closed, your profile, booking history, saved artists, and reviews
          are permanently deleted. This cannot be undone — even by our team.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5',
            'text-sm font-medium text-red-600 shadow-sm transition-all',
            'hover:border-red-400 hover:bg-red-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1',
          )}
        >
          <AlertTriangleIcon className="h-4 w-4" />
          Close my account
        </button>
      </SectionCard>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Close your account?"
        size="sm"
      >
        <div className="mb-5 flex gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangleIcon className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm leading-relaxed text-[#717171]">
            This will permanently delete your profile, booking history, reviews, and favourites.{' '}
            <strong className="text-[#1A1A1A]">This cannot be reversed.</strong>
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Keep my account
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Yes, close my account
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-7 w-48 rounded-lg bg-[#f3ece9]" />
        <div className="mt-2 h-4 w-72 rounded-lg bg-[#f3ece9]" />
      </div>
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <div className="hidden space-y-2 lg:block">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 rounded-xl bg-[#f3ece9]" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-64 rounded-2xl bg-[#f3ece9]" />
          <div className="h-48 rounded-2xl bg-[#f3ece9]" />
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<SectionId>('personal')

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('fetch failed')
      const data = (await res.json()) as ProfileData
      setProfile(data)
    } catch {
      toast.error("Couldn't load your settings — please refresh.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') fetchProfile()
  }, [status, router, fetchProfile])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
          <PageSkeleton />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]">
        <p className="text-sm text-[#717171]">
          Unable to load settings. Please refresh the page.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-jakarta">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 lg:px-12 xl:px-20">

        {/* Back link */}
        <Link
          href="/dashboard/customer"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-[#717171] transition-colors hover:text-[#1A1A1A]"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Dashboard
        </Link>

        {/* Body: sidebar + content */}
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">

          {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <nav className="sticky top-6" aria-label="Settings navigation">
              {/* Header */}
              <div className="mb-8 px-1">
                <h2 className="text-lg font-bold text-[#E96B56]">Account Settings</h2>
                <p className="mt-0.5 text-xs text-[#717171]">Manage your professional presence</p>
              </div>

              {/* Nav items */}
              <div className="space-y-0.5">
                {ALL_NAV_ITEMS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={cn(
                      'flex w-full items-center gap-3 py-3 text-left text-sm transition-all',
                      activeSection === id
                        ? 'border-l-4 border-[#E96B56] pl-4 font-bold text-[#E96B56]'
                        : 'pl-5 font-medium text-[#717171] hover:text-[#E96B56] hover:bg-[#f3ece9] rounded-r-xl',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        activeSection === id ? 'text-[#E96B56]' : 'text-[#717171]',
                      )}
                    />
                    {label}
                  </button>
                ))}

              </div>

              {/* View Public Profile */}
              <div className="mt-8 px-1">
                <Link
                  href="/profile"
                  className="block w-full rounded-xl bg-[#FAEEED] py-2.5 text-center text-sm font-semibold text-[#E96B56] hover:bg-[#f3ece9] transition-colors"
                >
                  View Public Profile
                </Link>
              </div>
            </nav>
          </aside>

          {/* ── Mobile tabs ───────────────────────────────────────────── */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {ALL_NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                  activeSection === id
                    ? 'bg-[#1A1A1A] text-white'
                    : 'border border-[#e8e1de] bg-white text-[#717171] hover:text-[#1A1A1A]',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Content panel ─────────────────────────────────────────── */}
          <main className="min-w-0">
            {activeSection === 'personal' && (
              <PersonalInfoSection profile={profile} onRefresh={fetchProfile} />
            )}
            {activeSection === 'security' && <SecuritySection profile={profile} />}
            {activeSection === 'notifications' && <NotificationsSection />}
            {activeSection === 'privacy' && <PrivacySection />}
            {activeSection === 'payments' && <PaymentsSection />}
            {activeSection === 'help' && <HelpSection />}
          </main>
        </div>
      </div>
    </div>
  )
}
