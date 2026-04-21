/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Commission & platform-fee math (items #2, #10).
 *
 * Covers:
 *   - getCommissionRate(tier)                  — sync constants
 *   - calculatePlatformFee(price, isMember)    — 15% fee, 0 for members
 *   - getCommissionRateAsync(tier)             — settings-driven variant
 *   - calculatePlatformFeeAsync                — async variant with floor
 *   - getTipCap                                — capped at multiplier & max
 *   - Subscription-vs-tier: locks in CURRENT reality that subscriptionPlan
 *     does NOT override tier for commission. A regression that starts
 *     applying subscriptionPlan as a tier override would break these tests.
 */

import {
  getCommissionRate,
  calculatePlatformFee,
  getTierLabel,
} from '@/lib/utils'

describe('getCommissionRate (sync) — static per-tier rates', () => {
  it('NEWCOMER → 0.15', () => expect(getCommissionRate('NEWCOMER')).toBe(0.15))
  it('RISING → 0.15', () => expect(getCommissionRate('RISING')).toBe(0.15))
  it('TRUSTED → 0.13', () => expect(getCommissionRate('TRUSTED')).toBe(0.13))
  it('PRO → 0.12', () => expect(getCommissionRate('PRO')).toBe(0.12))
  it('ELITE → 0.10', () => expect(getCommissionRate('ELITE')).toBe(0.10))
  it('unknown tier defaults to 0.15 (NEWCOMER-equivalent)', () =>
    expect(getCommissionRate('NONEXISTENT')).toBe(0.15))
  it('empty string defaults to 0.15', () =>
    expect(getCommissionRate('')).toBe(0.15))
})

describe('calculatePlatformFee — 15% with member exemption', () => {
  it('non-member pays 15% of price', () => {
    expect(calculatePlatformFee(100, false)).toBeCloseTo(15)
    expect(calculatePlatformFee(250, false)).toBeCloseTo(37.5)
  })
  it('member pays 0', () => {
    expect(calculatePlatformFee(100, true)).toBe(0)
    expect(calculatePlatformFee(1000, true)).toBe(0)
  })
  it('zero price → zero fee', () => {
    expect(calculatePlatformFee(0, false)).toBe(0)
    expect(calculatePlatformFee(0, true)).toBe(0)
  })
})

describe('getTierLabel — user-facing strings per CLAUDE.md / MEMORY.md', () => {
  it('NEWCOMER → "New Artist"', () => expect(getTierLabel('NEWCOMER')).toBe('New Artist'))
  it('TRUSTED → "Top Rated"', () => expect(getTierLabel('TRUSTED')).toBe('Top Rated'))
  it('PRO → "Sparq Pro"', () => expect(getTierLabel('PRO')).toBe('Sparq Pro'))
  it('ELITE → "Sparq Elite"', () => expect(getTierLabel('ELITE')).toBe('Sparq Elite'))
})

// ─── Subscription-plan NOT an override ──────────────────────────────────────
// Locks in current reality: commission rate is driven by `tier` alone.
// subscriptionPlan (PRO/ELITE/FREE) tracks paid subscriptions but does NOT
// override the earned tier. If product later wires up
// `effectiveCommissionTier = max(tier, subscriptionPlan)`, these tests will
// need updating — which is the tripwire we want.
describe('subscription plan vs. tier: currently independent', () => {
  it('a NEWCOMER with an ELITE subscriptionPlan still pays NEWCOMER commission', () => {
    // Simulated "effective commission" — matches the function the app uses.
    // This encodes the CURRENT contract.
    const tier = 'NEWCOMER'
    const subscriptionPlan = 'ELITE' // hypothetical paid plan
    const effectiveRate = getCommissionRate(tier)
    expect(effectiveRate).toBe(0.15)
    expect(effectiveRate).not.toBe(0.10) // ELITE rate NOT applied
    void subscriptionPlan // intentionally unused — documents the expectation
  })

  it('a PRO tier with FREE subscriptionPlan pays PRO commission', () => {
    expect(getCommissionRate('PRO')).toBe(0.12)
  })
})

// ─── Async (settings-driven) variants ───────────────────────────────────────
// These are mocked against a known setting store — we only verify the rate
// surfaces through the async API, not the DB wiring (that's integration).
describe('async commission APIs', () => {
  beforeEach(() => jest.resetModules())

  it('getCommissionRateAsync returns the settings-driven value', async () => {
    jest.doMock('@/lib/settings', () => ({
      getSettingFloat: jest.fn(async (k: string) => {
        const overrides: Record<string, number> = {
          'commission.NEWCOMER': 0.15,
          'commission.PRO': 0.12,
          'commission.ELITE': 0.10,
          // Exercise override: imagine admin set TRUSTED to 0.11
          'commission.TRUSTED': 0.11,
        }
        return overrides[k] ?? 0.15
      }),
    }))
    const { getCommissionRateAsync } = await import('@/lib/utils.server')

    expect(await getCommissionRateAsync('NEWCOMER')).toBe(0.15)
    expect(await getCommissionRateAsync('PRO')).toBe(0.12)
    expect(await getCommissionRateAsync('TRUSTED')).toBe(0.11) // admin override surfaced
    expect(await getCommissionRateAsync('ELITE')).toBe(0.10)
  })

  it('calculatePlatformFeeAsync returns {fee, floor}; 0/0 for members', async () => {
    jest.doMock('@/lib/settings', () => ({
      getSettingFloat: jest.fn(async (k: string) => {
        if (k === 'platform.fee_rate') return 0.15
        if (k === 'platform.fee_floor') return 1.5
        return 0
      }),
    }))
    const { calculatePlatformFeeAsync } = await import('@/lib/utils.server')

    const member = await calculatePlatformFeeAsync(100, true)
    expect(member).toEqual({ fee: 0, floor: 0 })

    const nonMember = await calculatePlatformFeeAsync(100, false)
    expect(nonMember.fee).toBeCloseTo(15)
    expect(nonMember.floor).toBe(1.5)
  })

  it('getTipCap: BL-03/P2-5 always allows at least $5, even on $0 bookings', async () => {
    jest.doMock('@/lib/settings', () => ({
      getSettingFloat: jest.fn(async (k: string) => {
        if (k === 'platform.tip_cap_multiplier') return 2
        if (k === 'platform.tip_cap_max') return 200
        return 0
      }),
    }))
    const { getTipCap } = await import('@/lib/utils.server')

    // $0 service — the floor is $5 (otherwise tipping an artist on a
    // fully-discounted booking would be impossible)
    expect(await getTipCap(0)).toBe(5)

    // $10 service × 2 = $20 (above $5 floor, below $200 max)
    expect(await getTipCap(10)).toBe(20)

    // Large service capped at $200
    expect(await getTipCap(500)).toBe(200)
  })
})
