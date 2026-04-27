/**
 * Server-only utility functions that require Prisma / settings access.
 * Import these ONLY in API routes, server components, and server actions.
 * Never import this file from client components — use '@/lib/utils' instead.
 */
import { getSettingFloat } from '@/lib/settings'

// Premium tier system removed — single flat commission rate.
// `_tier` retained for source-compat with callers still passing a placeholder.
export async function getCommissionRateAsync(_tier?: string): Promise<number> {
  return getSettingFloat('commission.rate')
}

export async function calculatePlatformFeeAsync(
  servicePrice: number,
  isMember: boolean,
): Promise<{ fee: number; floor: number }> {
  if (isMember) return { fee: 0, floor: 0 }
  const feeRate = await getSettingFloat('platform.fee_rate')
  const feeFloor = await getSettingFloat('platform.fee_floor')
  return { fee: Math.round(servicePrice * feeRate * 100) / 100, floor: feeFloor }
}

export async function getBookingNoticeHours(): Promise<number> {
  return getSettingFloat('platform.booking_notice_hours')
}

export async function getMaxBookingDays(): Promise<number> {
  return getSettingFloat('platform.max_booking_days')
}

export async function getTipCap(servicePrice: number): Promise<number> {
  const multiplier = await getSettingFloat('platform.tip_cap_multiplier')
  const max = await getSettingFloat('platform.tip_cap_max')
  // BL-03/P2-5: Always allow at least a $5 tip, even on $0 (fully-discounted) bookings.
  return Math.max(5, Math.min(servicePrice * multiplier, max))
}
