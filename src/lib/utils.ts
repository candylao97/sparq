import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

// BL-1: All date display functions pin to Australia/Sydney so they render
// correctly during AEDT (UTC+11, Oct–Apr) as well as AEST (UTC+10, Apr–Oct).
// This matters because Node.js defaults to UTC when parsing date strings, and
// any hardcoded "+10:00" offset is wrong during daylight saving time.
const SYDNEY_LOCALE_OPTIONS = { timeZone: 'Australia/Sydney' } as const

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...SYDNEY_LOCALE_OPTIONS,
  }).format(new Date(date))
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...SYDNEY_LOCALE_OPTIONS,
  }).format(new Date(date))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${minutes} ${ampm}`
}

// Must stay in sync with settings.ts DEFAULTS — use getCommissionRateAsync() for live values
// Settings DEFAULTS: NEWCOMER=0.15, RISING=0.15, TRUSTED=0.13, PRO=0.12, ELITE=0.10
export function getCommissionRate(tier: string): number {
  switch (tier) {
    case 'ELITE':
      return 0.10
    case 'PRO':
      return 0.12
    case 'TRUSTED':
      return 0.13
    case 'RISING':
      return 0.15
    case 'NEWCOMER':
      return 0.15
    default:
      return 0.15
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'ELITE': return '#1A1A1A'      // near black — exclusive
    case 'PRO': return '#a63a29'        // primary dark — premium
    case 'TRUSTED': return '#E96B56'    // coral — established
    case 'RISING': return '#c97d5a'     // warm amber — growing
    case 'NEWCOMER': return '#9C7E6A'   // muted warm brown — starting
    default: return '#717171'
  }
}

export function getTierLabel(tier: string): string {
  switch (tier) {
    case 'ELITE': return 'Sparq Elite'
    case 'PRO': return 'Sparq Pro'
    case 'TRUSTED': return 'Top Rated'
    case 'RISING': return 'Rising Star'
    case 'NEWCOMER': return 'New Artist'
    default: return tier
  }
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'NAILS': return 'Nails'
    case 'LASHES': return 'Lashes'
    case 'HAIR': return 'Hair'
    case 'MAKEUP': return 'Makeup'
    case 'BROWS': return 'Brows'
    case 'WAXING': return 'Waxing'
    case 'MASSAGE': return 'Massage'
    case 'FACIALS': return 'Facials'
    case 'OTHER': return 'Other'
    default: return 'Service'
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'NAILS': return 'Nails'
    case 'LASHES': return 'Lashes'
    case 'HAIR': return 'Hair'
    case 'MAKEUP': return 'Makeup'
    case 'BROWS': return 'Brows'
    case 'WAXING': return 'Waxing'
    case 'MASSAGE': return 'Massage'
    case 'FACIALS': return 'Facials'
    case 'OTHER': return 'Other'
    default: return category
  }
}

export function getLocationLabel(location: string): string {
  switch (location) {
    case 'AT_HOME': return 'Comes to you'
    case 'STUDIO': return 'At a studio'
    case 'BOTH': return 'Home & studio'
    default: return location
  }
}

export function calculatePlatformFee(price: number, isMember: boolean): number {
  if (isMember) return 0
  return price * 0.15
}

// ── Async settings-driven variants ───────────────────────────────────────────
// Moved to '@/lib/utils.server' to keep this file safe for client components.
// API routes should import from '@/lib/utils.server' directly.

export function relativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatShortDate(date)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending Response',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DECLINED: 'Declined',
    CANCELLED_BY_CUSTOMER: 'Cancelled by Customer',
    CANCELLED_BY_PROVIDER: 'Cancelled by Artist',
    REFUNDED: 'Refunded',
    EXPIRED: 'Expired',
    DISPUTED: 'Disputed',
    RESCHEDULE_REQUESTED: 'Reschedule Requested',
    NO_SHOW: 'No Show',
  }
  return labels[status] || status
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-[#fdf6ec] text-[#a88443]',
    CONFIRMED: 'bg-[#eaf6ef] text-[#2e7d52]',
    COMPLETED: 'bg-[#eaf0fa] text-[#2c5ea8]',
    CANCELLED: 'bg-[#f3ece9] text-[#717171]',
    DECLINED: 'bg-[#fceae8] text-[#a63a29]',
    CANCELLED_BY_CUSTOMER: 'bg-[#f3ece9] text-[#717171]',
    CANCELLED_BY_PROVIDER: 'bg-[#fceae8] text-[#a63a29]',
    REFUNDED: 'bg-[#f3ece9] text-[#717171]',
    EXPIRED: 'bg-[#f3ece9] text-[#717171]',
    DISPUTED: 'bg-[#fceae8] text-[#E96B56]',
    RESCHEDULE_REQUESTED: 'bg-[#fdf6ec] text-[#a88443]',
    NO_SHOW: 'bg-[#f3ece9] text-[#717171]',
  }
  return colors[status] || 'bg-[#f3ece9] text-[#717171]'
}

export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NONE: 'No Payment',
    AUTH_PENDING: 'Authorizing',
    AUTHORISED: 'Authorized',
    CAPTURED: 'Captured',
    AUTH_RELEASED: 'Released',
    REFUNDED: 'Refunded',
    FAILED: 'Failed',
  }
  return labels[status] || status
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NONE: 'bg-[#f3ece9] text-[#717171]',
    AUTH_PENDING: 'bg-yellow-100 text-yellow-800',
    AUTHORISED: 'bg-blue-100 text-blue-800',
    CAPTURED: 'bg-green-100 text-green-800',
    AUTH_RELEASED: 'bg-[#f3ece9] text-[#717171]',
    REFUNDED: 'bg-purple-100 text-purple-800',
    FAILED: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-[#f3ece9] text-[#717171]'
}
