/**
 * AUDIT-001 — Effective provider tier with Stripe subscription check.
 *
 * Problem: the stored `ProviderProfile.tier` (NEWCOMER / RISING / TRUSTED /
 * PRO / ELITE) drives commission rates and the accept-window used when
 * creating bookings. Tier is trusted blindly — if an artist cancels their
 * paid subscription, the tier field on their profile doesn't flip back
 * automatically, so they keep getting the paid tier's benefits (lower
 * commission, longer accept window).
 *
 * This helper is the single source of truth for "what tier effectively
 * applies right now?" — it reads the tier field and the cached Stripe
 * subscription status and downgrades to NEWCOMER unless the subscription
 * is in a currently-paying state.
 *
 * Active = Stripe status in { active, trialing }.
 * Everything else (past_due, canceled, unpaid, incomplete, null) → NEWCOMER.
 *
 * The stripe-subscription webhook handler already maintains
 * `stripeSubscriptionStatus` on ProviderProfile, so this helper is a pure
 * read — no extra Stripe API call.
 */

/** Subset of the ProviderTier enum values we care about. */
export type ProviderTier = 'NEWCOMER' | 'RISING' | 'TRUSTED' | 'PRO' | 'ELITE'

/** Tiers that are unlocked via a paid subscription. */
const PAID_TIERS: ReadonlySet<ProviderTier> = new Set<ProviderTier>([
  'PRO',
  'ELITE',
])

/** Stripe subscription.status values that count as "currently paying". */
const ACTIVE_STRIPE_STATUSES: ReadonlySet<string> = new Set([
  'active',
  'trialing',
])

/**
 * Input shape — designed to match `ProviderProfile` columns so callers
 * can pass the record directly. Stripe fields are optional/nullable so
 * that providers with no subscription history don't need special-casing.
 */
export interface TierSubscriptionSnapshot {
  tier: string | null | undefined
  stripeSubscriptionStatus?: string | null | undefined
}

/**
 * Narrow arbitrary strings to a known ProviderTier, defaulting to NEWCOMER.
 */
export function normaliseTier(tier: string | null | undefined): ProviderTier {
  switch (tier) {
    case 'NEWCOMER':
    case 'RISING':
    case 'TRUSTED':
    case 'PRO':
    case 'ELITE':
      return tier
    default:
      return 'NEWCOMER'
  }
}

/**
 * Returns the tier that should be used for commission, accept-window,
 * and any other paid-plan gate. Downgrades PRO / ELITE to NEWCOMER when
 * the subscription is not currently active.
 */
export function getEffectiveProviderTier(
  snapshot: TierSubscriptionSnapshot,
): ProviderTier {
  const stored = normaliseTier(snapshot.tier)

  // Free / self-earned tiers (NEWCOMER, RISING, TRUSTED) are not subscription-
  // gated — return as-is.
  if (!PAID_TIERS.has(stored)) return stored

  const status = (snapshot.stripeSubscriptionStatus ?? '').toLowerCase()
  if (ACTIVE_STRIPE_STATUSES.has(status)) return stored

  // Claimed a paid tier but no active subscription → fall back to NEWCOMER
  // for any benefits calculation. The stored tier isn't mutated here;
  // the subscription-deleted webhook is responsible for that.
  return 'NEWCOMER'
}

/**
 * Convenience: is the provider currently on an active paid subscription?
 * Used for UI badges / "Sparq Pro" displays that should vanish when the
 * subscription lapses even if the stored tier is still PRO.
 */
export function hasActivePaidSubscription(
  snapshot: TierSubscriptionSnapshot,
): boolean {
  return PAID_TIERS.has(normaliseTier(snapshot.tier)) &&
         ACTIVE_STRIPE_STATUSES.has(
           (snapshot.stripeSubscriptionStatus ?? '').toLowerCase(),
         )
}
