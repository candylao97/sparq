'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { cn, formatShortDate } from '@/lib/utils'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Star,
  BookOpen,
  Pencil,
  Save,
  X,
  MapPin,
  Globe,
  ShieldCheck,
  Loader2,
} from 'lucide-react'

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  image: string | null
  role: string
  createdAt: string
  totalBookings: number
  totalReviews: number
  providerProfile: {
    bio: string | null
    tagline: string | null
    suburb: string | null
    city: string
    languages: string[]
    isVerified: boolean
    tier: string
    services: { id: string; title: string }[]
    portfolio: { id: string; url: string }[]
    verification: { status: string } | null
  } | null
  customerProfile: {
    membership: string
  } | null
}

export default function ProfilePage() {
  const { status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [tagline, setTagline] = useState('')
  const [suburb, setSuburb] = useState('')
  const [city, setCity] = useState('')
  const [languages, setLanguages] = useState('')

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProfile(data)
      setName(data.name || '')
      setPhone(data.phone || '')
      setBio(data.providerProfile?.bio || '')
      setTagline(data.providerProfile?.tagline || '')
      setSuburb(data.providerProfile?.suburb || '')
      setCity(data.providerProfile?.city || '')
      setLanguages(data.providerProfile?.languages?.join(', ') || '')
    } catch {
      toast.error('Failed to load profile')
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

  async function handleSave() {
    setSaving(true)
    try {
      const isProvider = profile?.role === 'PROVIDER' || profile?.role === 'BOTH'
      const body: Record<string, unknown> = { name, phone }

      if (isProvider) {
        body.providerData = {
          bio,
          tagline,
          suburb,
          city,
          languages: languages.split(',').map(l => l.trim()).filter(Boolean),
        }
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save')

      await fetchProfile()
      setEditing(false)
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName(profile?.name || '')
    setPhone(profile?.phone || '')
    setBio(profile?.providerProfile?.bio || '')
    setTagline(profile?.providerProfile?.tagline || '')
    setSuburb(profile?.providerProfile?.suburb || '')
    setCity(profile?.providerProfile?.city || '')
    setLanguages(profile?.providerProfile?.languages?.join(', ') || '')
    setEditing(false)
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'PROVIDER':
        return { label: 'Artist', color: 'bg-amber-100 text-amber-800' }
      case 'CUSTOMER':
        return { label: 'Client', color: 'bg-blue-100 text-blue-800' }
      case 'BOTH':
        return { label: 'Client & Artist', color: 'bg-purple-100 text-purple-800' }
      case 'ADMIN':
        return { label: 'Admin', color: 'bg-red-100 text-red-800' }
      default:
        return { label: role, color: 'bg-[#f3ece9] text-[#1A1A1A]' }
    }
  }

  function getInitial(name: string | null) {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
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
        <p className="text-[#717171]">Unable to load profile.</p>
      </div>
    )
  }

  const roleBadge = getRoleBadge(profile.role)
  const isProvider = profile.role === 'PROVIDER' || profile.role === 'BOTH'

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

        {/* Header Section */}
        <div className="rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            {profile.image ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-[#e8e1de]">
                <Image
                  src={profile.image}
                  alt={profile.name || 'Profile'}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#e8e1de] bg-[#E96B56] text-3xl font-bold text-white">
                {getInitial(profile.name)}
              </div>
            )}

            {/* Name & email */}
            <h1 className="mt-4 text-2xl font-bold text-[#1A1A1A]">
              {profile.name || 'No name set'}
            </h1>
            <p className="mt-1 text-sm text-[#717171]">{profile.email}</p>

            {/* Role badge */}
            <span
              className={cn(
                'mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                roleBadge.color
              )}
            >
              {roleBadge.label}
            </span>

            {/* Member since */}
            <p className="mt-2 text-xs text-[#717171]">
              Member since {formatShortDate(profile.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#e8e1de] bg-white p-4 shadow-sm text-center">
            <BookOpen className="mx-auto h-5 w-5 text-[#E96B56]" />
            <p className="mt-2 text-2xl font-bold text-[#1A1A1A]">{profile.totalBookings}</p>
            <p className="text-xs text-[#717171]">Bookings</p>
          </div>
          <div className="rounded-2xl border border-[#e8e1de] bg-white p-4 shadow-sm text-center">
            <Star className="mx-auto h-5 w-5 text-[#E96B56]" />
            <p className="mt-2 text-2xl font-bold text-[#1A1A1A]">{profile.totalReviews}</p>
            <p className="text-xs text-[#717171]">Reviews</p>
          </div>
          <div className="rounded-2xl border border-[#e8e1de] bg-white p-4 shadow-sm text-center">
            <Calendar className="mx-auto h-5 w-5 text-[#E96B56]" />
            <p className="mt-2 text-2xl font-bold text-[#1A1A1A]">
              {new Date(profile.createdAt).getFullYear()}
            </p>
            <p className="text-xs text-[#717171]">Joined</p>
          </div>
        </div>

        {/* Personal Info */}
        <div className="mt-4 rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Personal Information</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e1de] px-3 py-1.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e1de] px-3 py-1.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#f9f2ef]"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E96B56] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#a63a29] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {/* Name */}
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-[#717171]" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[#717171]">Full Name</p>
                {editing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                  />
                ) : (
                  <p className="mt-0.5 text-sm text-[#1A1A1A]">{profile.name || '-'}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-[#717171]" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[#717171]">Email</p>
                <p className="mt-0.5 text-sm text-[#1A1A1A]">{profile.email || '-'}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-[#717171]" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[#717171]">Phone</p>
                {editing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0412 345 678"
                    className="mt-1 w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                  />
                ) : (
                  <p className="mt-0.5 text-sm text-[#1A1A1A]">{profile.phone || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Provider Section */}
        {isProvider && profile.providerProfile && (
          <div className="mt-4 rounded-2xl border border-[#e8e1de] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Artist Profile</h2>
              {profile.providerProfile.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>

            <div className="mt-5 space-y-4">
              {/* Tagline */}
              <div>
                <p className="text-xs font-medium text-[#717171]">Tagline</p>
                {editing ? (
                  <input
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="Your short tagline"
                    className="mt-1 w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                  />
                ) : (
                  <p className="mt-0.5 text-sm text-[#1A1A1A]">
                    {profile.providerProfile.tagline || '-'}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <p className="text-xs font-medium text-[#717171]">Bio</p>
                {editing ? (
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={4}
                    placeholder="Tell clients about yourself..."
                    className="mt-1 w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56] resize-none"
                  />
                ) : (
                  <p className="mt-0.5 text-sm text-[#1A1A1A] whitespace-pre-wrap">
                    {profile.providerProfile.bio || '-'}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#717171]" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-[#717171]">Location</p>
                  {editing ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={suburb}
                        onChange={e => setSuburb(e.target.value)}
                        placeholder="Suburb"
                        className="flex-1 rounded-lg border border-[#e8e1de] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                      />
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="City"
                        className="flex-1 rounded-lg border border-[#e8e1de] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                      />
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm text-[#1A1A1A]">
                      {[profile.providerProfile.suburb, profile.providerProfile.city]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 text-[#717171]" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-[#717171]">Languages</p>
                  {editing ? (
                    <input
                      type="text"
                      value={languages}
                      onChange={e => setLanguages(e.target.value)}
                      placeholder="English, Vietnamese, ..."
                      className="mt-1 w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]"
                    />
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {profile.providerProfile.languages.length > 0 ? (
                        profile.providerProfile.languages.map(lang => (
                          <span
                            key={lang}
                            className="rounded-full bg-[#f3ece9] px-2.5 py-0.5 text-xs font-medium text-[#1A1A1A]"
                          >
                            {lang}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-[#1A1A1A]">-</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
