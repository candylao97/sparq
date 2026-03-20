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

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${minutes} ${ampm}`
}

export function getCommissionRate(tier: string): number {
  switch (tier) {
    case 'PRO':
    case 'ELITE':
      return 0.10
    case 'TRUSTED':
      return 0.13
    default:
      return 0.15
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'ELITE': return '#1A1A1A'
    case 'PRO': return '#E96B56'
    case 'TRUSTED': return '#a63a29'
    case 'RISING': return '#E96B56'
    default: return '#6B7280'
  }
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'NAILS': return 'Nails'
    case 'LASHES': return 'Lashes'
    default: return 'Service'
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'NAILS': return 'Nails'
    case 'LASHES': return 'Lashes'
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
    CANCELLED_BY_PROVIDER: 'Cancelled by Provider',
    REFUNDED: 'Refunded',
    EXPIRED: 'Expired',
    DISPUTED: 'Disputed',
  }
  return labels[status] || status
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-[#f3ece9] text-[#717171]',
    DECLINED: 'bg-red-100 text-red-800',
    CANCELLED_BY_CUSTOMER: 'bg-[#f3ece9] text-[#717171]',
    CANCELLED_BY_PROVIDER: 'bg-orange-100 text-orange-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
    EXPIRED: 'bg-[#f3ece9] text-[#717171]',
    DISPUTED: 'bg-red-100 text-red-800',
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
