'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Pencil, Save, X, ShieldCheck, Loader2, Check,
  Star, ArrowLeft,
} from 'lucide-react'

interface RecentReview {
  id: string
  rating: number
  text: string | null
  createdAt: string
  booking: {
    provider: { name: string | null; image: string | null }
    service: { title: string }
  }
}

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
  avgRating: number | null
  recentReviews: RecentReview[]
  providerProfile: {
    bio: string | null
    tagline: string | null
    suburb: string | null
    city: string
    languages: string[]
    isVerified: boolean
    services: { id: string; title: string }[]
    portfolio: { id: string; url: string }[]
    verification: { status: string } | null
  } | null
  customerProfile: {
    id: string
  } | null
}

type EditSection = 'personal' | 'artist' | null

/* ── Helpers ── */
function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'xs' }) {
  const px = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const starPath = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.min(1, Math.max(0, rating - (i - 1)))
        return (
          <span key={i} className={`relative inline-block ${px}`}>
            <svg className={`${px} text-[#e8e1de]`} viewBox="0 0 20 20" fill="currentColor">
              <path d={starPath} />
            </svg>
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg className={`${px} text-[#E96B56]`} viewBox="0 0 20 20" fill="currentColor">
                  <path d={starPath} />
                </svg>
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

function ProviderAvatar({ name, image, size = 10 }: { name: string | null; image: string | null; size?: number }) {
  const dim = `h-${size} w-${size}`
  return image ? (
    <div className={`relative ${dim} flex-shrink-0 overflow-hidden rounded-full`}>
      <Image src={image} alt={name || 'Artist'} fill className="object-cover" sizes={`${size * 4}px`} />
    </div>
  ) : (
    <div className={`${dim} flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E96B56] to-[#a63a29] text-xs font-bold text-white`}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  )
}

/* ── Page ── */
export default function ProfilePage() {
  const { status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditSection>(null)
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
      if (!res.ok) throw new Error()
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
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated') fetchProfile()
  }, [status, router, fetchProfile])

  const BIO_MIN_LENGTH = 50

  async function handleSave(section: EditSection) {
    // UX-M5: Enforce minimum 50-character bio for providers
    const isProvider = profile?.role === 'PROVIDER' || profile?.role === 'BOTH'
    if (isProvider && section === 'artist' && bio.trim().length > 0 && bio.trim().length < BIO_MIN_LENGTH) {
      toast.error(`Your bio needs at least ${BIO_MIN_LENGTH} characters to help clients get to know you.`)
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name, phone }
      if (isProvider && section === 'artist') {
        body.providerData = {
          bio, tagline, suburb, city,
          languages: languages.split(',').map(l => l.trim()).filter(Boolean),
        }
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      await fetchProfile()
      setEditing(null)
      toast.success('Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (!profile) return
    setName(profile.name || '')
    setPhone(profile.phone || '')
    setBio(profile.providerProfile?.bio || '')
    setTagline(profile.providerProfile?.tagline || '')
    setSuburb(profile.providerProfile?.suburb || '')
    setCity(profile.providerProfile?.city || '')
    setLanguages(profile.providerProfile?.languages?.join(', ') || '')
    setEditing(null)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-[#717171]">Unable to load profile.</p>
      </div>
    )
  }

  const isProvider = profile.role === 'PROVIDER' || profile.role === 'BOTH'
  const joinedYear = new Date(profile.createdAt).getFullYear()
  const firstName = profile.name?.split(' ')[0] || 'there'

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">

        {/* ── Top bar (matches DashboardHeader chrome) ── */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={isProvider ? '/dashboard/provider' : '/dashboard/customer'}
            className="flex items-center gap-1.5 text-sm font-medium text-[#717171] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/account-settings">
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8e1de] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] shadow-sm transition-colors hover:border-[#1A1A1A]">
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </button>
            </Link>
          </div>
        </div>

        {/* ── Profile hero (matches dashboard greeting block) ── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile.image ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-white shadow-md">
                  <Image src={profile.image} alt={profile.name || 'Profile'} fill priority className="object-cover" sizes="80px" />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#E96B56] to-[#a63a29] text-2xl font-bold text-white ring-4 ring-white shadow-md">
                  {profile.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-3xl font-bold leading-tight text-[#1A1A1A]">
                  {profile.name || 'No name set'}
                </h1>
                {profile.phone ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[#717171]">Member since {joinedYear}</p>
            </div>
          </div>
        </div>

        {/* ── Stats strip (matches EarningsSnapshot mini-stat tiles) ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {profile.avgRating && profile.totalReviews > 0 && (
            <div className="rounded-2xl border border-[#f0e8e4] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-medium text-[#717171]">Avg rating</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-[#1A1A1A]">
                <Star className="h-5 w-5 fill-[#E96B56] text-[#E96B56]" />
                {profile.avgRating}
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-[#f0e8e4] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-medium text-[#717171]">Reviews</p>
            <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{profile.totalReviews}</p>
          </div>
          <div className="rounded-2xl border border-[#f0e8e4] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-medium text-[#717171]">Bookings</p>
            <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{profile.totalBookings}</p>
          </div>
          {profile.totalReviews === 0 && (
            <div className="rounded-2xl border border-[#fce9e6] bg-[#fdf6f4] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-medium text-[#717171]">Status</p>
              <p className="mt-1 text-sm font-semibold text-[#E96B56]">New on Sparq</p>
            </div>
          )}
        </div>

        {/* ── About section ── */}
        <div className="mb-6 rounded-2xl border border-[#f0e8e4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">About {firstName}</h2>
            {isProvider && profile.providerProfile && editing !== 'artist' && (
              <button onClick={() => setEditing('artist')} className="text-sm font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#E96B56] transition-colors">
                Edit
              </button>
            )}
          </div>

          {isProvider && profile.providerProfile ? (
            editing === 'artist' ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#717171]">Tagline</label>
                  <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short headline..." className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#717171]">Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={5}
                    placeholder="Tell clients about yourself — your style, experience, and what makes your work special..."
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all resize-none ${
                      bio.trim().length > 0 && bio.trim().length < BIO_MIN_LENGTH
                        ? 'border-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200'
                        : 'border-[#e8e1de] focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]'
                    }`}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {bio.trim().length > 0 && bio.trim().length < BIO_MIN_LENGTH ? (
                      <p className="text-xs text-amber-600">{BIO_MIN_LENGTH - bio.trim().length} more characters needed</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-[#717171] ml-auto">{bio.length} chars</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#717171]">Suburb</label>
                    <input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="e.g. Surry Hills" className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#717171]">City</label>
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Sydney" className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#717171]">Languages</label>
                  <input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="English, Vietnamese, ..." className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCancel} className="inline-flex items-center gap-1 rounded-xl border border-[#e8e1de] px-4 py-2 text-sm text-[#717171] hover:bg-[#f9f2ef] transition-colors">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button onClick={() => handleSave('artist')} disabled={saving} className="inline-flex items-center gap-1 rounded-xl bg-[#E96B56] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d45a45] transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {profile.providerProfile.tagline && (
                  <p className="text-[15px] font-medium text-[#1A1A1A]">{profile.providerProfile.tagline}</p>
                )}
                {profile.providerProfile.bio ? (
                  <p className="text-[15px] leading-relaxed text-[#717171] whitespace-pre-wrap">{profile.providerProfile.bio}</p>
                ) : (
                  <p className="text-sm italic text-[#bbb]">No bio yet. Add one so clients can get to know you.</p>
                )}
              </div>
            )
          ) : (
            <p className="text-[15px] leading-relaxed text-[#717171]">
              {profile.totalBookings > 0
                ? `${firstName} has made ${profile.totalBookings} booking${profile.totalBookings === 1 ? '' : 's'} on Sparq.`
                : `${firstName} is new to Sparq and ready to discover great artists nearby.`}
            </p>
          )}
        </div>

        {/* ── Reviews section ── */}
        <div className="mb-6 rounded-2xl border border-[#f0e8e4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="mb-6 flex items-baseline gap-2">
            <h2 className="text-[15px] font-semibold text-[#1A1A1A] flex items-center gap-2">
              {profile.totalReviews > 0 && profile.avgRating && (
                <>
                  <Star className="h-4 w-4 fill-[#E96B56] text-[#E96B56]" />
                  <span>{profile.avgRating}</span>
                  <span className="text-[#e8e1de] font-normal">·</span>
                </>
              )}
              {profile.totalReviews} review{profile.totalReviews !== 1 ? 's' : ''}
            </h2>
          </div>

          {profile.recentReviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              {profile.recentReviews.map(review => (
                <div key={review.id} className="rounded-xl border border-[#f0e8e4] bg-[#FDFBF7] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <ProviderAvatar
                      name={review.booking.provider.name}
                      image={review.booking.provider.image}
                      size={10}
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A] leading-tight">
                        {review.booking.provider.name || 'Artist'}
                      </p>
                      <p className="text-xs text-[#717171]">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <StarRow rating={review.rating} />
                  {review.text ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#1A1A1A]">{review.text}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-[#bbb]">No written review</p>
                  )}
                  <p className="mt-2 text-xs text-[#717171]">{review.booking.service.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf6f4]">
                <Star className="h-5 w-5 text-[#E96B56]" />
              </div>
              <p className="text-sm font-semibold text-[#1A1A1A]">No reviews yet</p>
              <p className="mt-1 text-sm text-[#717171]">Complete a booking to receive reviews.</p>
            </div>
          )}

          {profile.totalReviews > 3 && (
            <button className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#f9f2ef] transition-colors">
              Show all {profile.totalReviews} reviews
            </button>
          )}
        </div>

        {/* ── Bottom grid: Personal info + Confirmed info + Membership ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">

          {/* Personal info */}
          <div className="rounded-2xl border border-[#f0e8e4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Personal info</h2>
              {editing !== 'personal' && (
                <button onClick={() => setEditing('personal')} className="text-sm font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#E96B56] transition-colors">
                  Edit
                </button>
              )}
            </div>

            {editing === 'personal' ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#717171]">Full name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#717171]">Phone number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0412 345 678" className="w-full rounded-xl border border-[#e8e1de] px-3 py-2.5 text-sm outline-none focus:border-[#E96B56] focus:ring-1 focus:ring-[#E96B56]" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCancel} className="inline-flex items-center gap-1 rounded-xl border border-[#e8e1de] px-4 py-2 text-sm text-[#717171] hover:bg-[#f9f2ef] transition-colors">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button onClick={() => handleSave('personal')} disabled={saving} className="inline-flex items-center gap-1 rounded-xl bg-[#E96B56] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d45a45] transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#f0e8e4]">
                <div className="py-3 first:pt-0">
                  <p className="text-xs text-[#717171]">Legal name</p>
                  <p className="mt-0.5 text-sm text-[#1A1A1A]">{profile.name || <span className="italic text-[#bbb]">Not set</span>}</p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-xs text-[#717171]">Email address</p>
                    <p className="mt-0.5 text-sm text-[#1A1A1A]">{profile.email}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-xs text-[#717171]">Phone number</p>
                    {profile.phone ? (
                      <p className="mt-0.5 text-sm text-[#1A1A1A]">{profile.phone}</p>
                    ) : (
                      <button onClick={() => setEditing('personal')} className="mt-0.5 text-sm text-[#E96B56] hover:underline">
                        Add phone number
                      </button>
                    )}
                  </div>
                  {profile.phone && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confirmed information */}
          <div className="rounded-2xl border border-[#f0e8e4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-4">
              {firstName}&apos;s confirmed info
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-[#1A1A1A]">
                <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                Email address
              </li>
              {profile.phone && (
                <li className="flex items-center gap-2.5 text-sm text-[#1A1A1A]">
                  <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  Phone number
                </li>
              )}
              {isProvider && profile.providerProfile?.isVerified && (
                <li className="flex items-center gap-2.5 text-sm text-[#1A1A1A]">
                  <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  Identity verified
                </li>
              )}
            </ul>
          </div>


        </div>
      </div>
    </div>
  )
}
