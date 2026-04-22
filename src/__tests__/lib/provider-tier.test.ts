/**
 * AUDIT-001 — Effective provider tier with Stripe subscription check.
 *
 * These tests codify the contract the booking API now relies on:
 *   - PRO / ELITE require an active Stripe subscription. Without one,
 *     commission + accept-window fall back to NEWCOMER.
 *   - NEWCOMER / RISING / TRUSTED are NOT subscription-gated (they're
 *     earned via platform activity), so they return as-is.
 *   - The raw string on the DB is lightly defended — unknown values
 *     normalise to NEWCOMER so we never emit an invalid tier.
 */

import {
  getEffectiveProviderTier,
  hasActivePaidSubscription,
  normaliseTier,
} from '@/lib/provider-tier'

describe('normaliseTier', () => {
  it('passes through valid tiers', () => {
    expect(normaliseTier('NEWCOMER')).toBe('NEWCOMER')
    expect(normaliseTier('RISING')).toBe('RISING')
    expect(normaliseTier('TRUSTED')).toBe('TRUSTED')
    expect(normaliseTier('PRO')).toBe('PRO')
    expect(normaliseTier('ELITE')).toBe('ELITE')
  })

  it('defaults unknown values to NEWCOMER', () => {
    expect(normaliseTier(null)).toBe('NEWCOMER')
    expect(normaliseTier(undefined)).toBe('NEWCOMER')
    expect(normaliseTier('GARBAGE')).toBe('NEWCOMER')
    expect(normaliseTier('')).toBe('NEWCOMER')
  })
})

describe('getEffectiveProviderTier — free tiers are not subscription-gated', () => {
  it('returns NEWCOMER for NEWCOMER regardless of subscription', () => {
    expect(
      getEffectiveProviderTier({ tier: 'NEWCOMER', stripeSubscriptionStatus: 'active' }),
    ).toBe('NEWCOMER')
    expect(
      getEffectiveProviderTier({ tier: 'NEWCOMER', stripeSubscriptionStatus: null }),
    ).toBe('NEWCOMER')
  })

  it('returns RISING for RISING regardless of subscription', () => {
    expect(
      getEffectiveProviderTier({ tier: 'RISING', stripeSubscriptionStatus: 'canceled' }),
    ).toBe('RISING')
  })

  it('returns TRUSTED for TRUSTED regardless of subscription', () => {
    expect(
      getEffectiveProviderTier({ tier: 'TRUSTED', stripeSubscriptionStatus: null }),
    ).toBe('TRUSTED')
  })
})

describe('getEffectiveProviderTier — PRO tier', () => {
  it('returns PRO when subscription is active', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: 'active' }),
    ).toBe('PRO')
  })

  it('returns PRO when subscription is trialing', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: 'trialing' }),
    ).toBe('PRO')
  })

  it('accepts mixed-case status from Stripe', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: 'ACTIVE' }),
    ).toBe('PRO')
  })

  it('falls back to NEWCOMER when subscription is past_due', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: 'past_due' }),
    ).toBe('NEWCOMER')
  })

  it('falls back to NEWCOMER when subscription is canceled', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: 'canceled' }),
    ).toBe('NEWCOMER')
  })

  it('falls back to NEWCOMER when subscription is unpaid', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: 'unpaid' }),
    ).toBe('NEWCOMER')
  })

  it('falls back to NEWCOMER when subscription is incomplete', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: 'incomplete' }),
    ).toBe('NEWCOMER')
  })

  it('falls back to NEWCOMER when subscriptionStatus is null', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO', stripeSubscriptionStatus: null }),
    ).toBe('NEWCOMER')
  })

  it('falls back to NEWCOMER when subscriptionStatus is undefined', () => {
    expect(
      getEffectiveProviderTier({ tier: 'PRO' }),
    ).toBe('NEWCOMER')
  })
})

describe('getEffectiveProviderTier — ELITE tier', () => {
  it('returns ELITE when subscription is active', () => {
    expect(
      getEffectiveProviderTier({ tier: 'ELITE', stripeSubscriptionStatus: 'active' }),
    ).toBe('ELITE')
  })

  it('falls back to NEWCOMER when subscription is canceled', () => {
    expect(
      getEffectiveProviderTier({ tier: 'ELITE', stripeSubscriptionStatus: 'canceled' }),
    ).toBe('NEWCOMER')
  })

  it('falls back to NEWCOMER when subscription is past_due', () => {
    expect(
      getEffectiveProviderTier({ tier: 'ELITE', stripeSubscriptionStatus: 'past_due' }),
    ).toBe('NEWCOMER')
  })
})

describe('hasActivePaidSubscription', () => {
  it('is true for PRO + active', () => {
    expect(
      hasActivePaidSubscription({ tier: 'PRO', stripeSubscriptionStatus: 'active' }),
    ).toBe(true)
  })

  it('is true for ELITE + trialing', () => {
    expect(
      hasActivePaidSubscription({ tier: 'ELITE', stripeSubscriptionStatus: 'trialing' }),
    ).toBe(true)
  })

  it('is false for PRO + past_due', () => {
    expect(
      hasActivePaidSubscription({ tier: 'PRO', stripeSubscriptionStatus: 'past_due' }),
    ).toBe(false)
  })

  it('is false for TRUSTED + active (free tier)', () => {
    expect(
      hasActivePaidSubscription({ tier: 'TRUSTED', stripeSubscriptionStatus: 'active' }),
    ).toBe(false)
  })

  it('is false for NEWCOMER regardless of status', () => {
    expect(
      hasActivePaidSubscription({ tier: 'NEWCOMER', stripeSubscriptionStatus: 'active' }),
    ).toBe(false)
  })
})

describe('AUDIT-001 acceptance matrix', () => {
  // Mirrors the acceptance criteria in the audit brief:
  //   PRO + no subscription → NEWCOMER-equivalent
  //   PRO + active → PRO
  //   PRO + past_due → NEWCOMER-equivalent
  //   ELITE + canceled → NEWCOMER-equivalent
  const cases: Array<[string, string | null, 'PRO' | 'ELITE' | 'NEWCOMER']> = [
    ['PRO',   null,        'NEWCOMER'],
    ['PRO',   'active',    'PRO'],
    ['PRO',   'past_due',  'NEWCOMER'],
    ['PRO',   'canceled',  'NEWCOMER'],
    ['ELITE', 'active',    'ELITE'],
    ['ELITE', 'canceled',  'NEWCOMER'],
    ['ELITE', 'unpaid',    'NEWCOMER'],
  ]
  it.each(cases)('tier=%s status=%s → %s', (tier, status, expected) => {
    expect(
      getEffectiveProviderTier({ tier, stripeSubscriptionStatus: status }),
    ).toBe(expected)
  })
})
