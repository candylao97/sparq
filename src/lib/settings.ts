/**
 * Platform Settings — cached from DB with 5-minute in-process TTL.
 * Falls back to hardcoded defaults if DB unavailable (guarantees startup safety).
 *
 * Keys used:
 *   commission.NEWCOMER, commission.RISING, commission.TRUSTED, commission.PRO, commission.ELITE
 *   platform.fee_rate           (default: 0.15)
 *   platform.fee_floor          (default: 1.50)
 *   platform.minimum_price      (default: 10)
 *   platform.booking_notice_hours (default: 4)
 *   platform.max_booking_days   (default: 180)
 *   platform.tip_cap_multiplier (default: 2)
 *   platform.tip_cap_max        (default: 200)
 *   platform.payout_delay_hours (default: 48)
 *   platform.dispute_window_hours (default: 48)
 */

import { prisma } from '@/lib/prisma'

type SettingsCache = { values: Map<string, string>; loadedAt: number }
let cache: SettingsCache | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const DEFAULTS: Record<string, string> = {
  'commission.NEWCOMER': '0.15',
  'commission.RISING': '0.15',
  'commission.TRUSTED': '0.13',
  'commission.PRO': '0.12',
  'commission.ELITE': '0.10',
  'platform.fee_rate': '0.15',
  'platform.fee_floor': '1.50',
  'platform.minimum_price': '10',
  'platform.booking_notice_hours': '4',
  'platform.max_booking_days': '180',
  'platform.tip_cap_multiplier': '2',
  'platform.tip_cap_max': '200',
  'platform.payout_delay_hours': '48',
  'platform.dispute_window_hours': '48',
  // P0-6: Maximum combined promo discount as a fraction of service price (20%).
  // Prevents promo codes from wiping out service revenue entirely.
  'platform.max_combined_discount': '0.20',
}

async function loadSettings(): Promise<Map<string, string>> {
  try {
    const rows = await prisma.platformSetting.findMany()
    const map = new Map<string, string>(rows.map(r => [r.key, r.value]))
    return map
  } catch {
    console.warn('[settings] DB unavailable — using defaults')
    return new Map()
  }
}

async function getCache(): Promise<Map<string, string>> {
  const now = Date.now()
  if (!cache || now - cache.loadedAt > CACHE_TTL_MS) {
    const values = await loadSettings()
    cache = { values, loadedAt: now }
  }
  return cache.values
}

export async function getSetting(key: string): Promise<string> {
  const map = await getCache()
  return map.get(key) ?? DEFAULTS[key] ?? ''
}

export async function getSettingFloat(key: string): Promise<number> {
  return parseFloat(await getSetting(key)) || parseFloat(DEFAULTS[key] ?? '0')
}

export function invalidateSettingsCache() {
  cache = null
}
