/**
 * AUDIT-009 / AUDIT-012 — Cancellation policy display helpers.
 *
 * Until now, cancellation policy text was only composed ad-hoc inside
 * booking detail / cancel flow screens. That made it easy for the
 * customer-facing profile page to fall out of sync with the refund logic
 * enforced in `src/app/api/bookings/[id]/route.ts`. This module is the
 * single source of truth mapped to `ProviderProfile.cancellationPolicyType`.
 */

export type CancellationPolicyType = 'FLEXIBLE' | 'MODERATE' | 'STRICT'

export interface CancellationPolicySummary {
  type: CancellationPolicyType
  label: string
  headline: string
  tiers: Array<{ window: string, refund: string }>
  customText?: string | null
}

/**
 * Narrow a stored string down to a valid CancellationPolicyType, defaulting
 * to MODERATE which matches the DB column default.
 */
export function normaliseCancellationPolicyType(
  type: string | null | undefined,
): CancellationPolicyType {
  switch (type) {
    case 'FLEXIBLE':
    case 'MODERATE':
    case 'STRICT':
      return type
    default:
      return 'MODERATE'
  }
}

/**
 * Human-readable summary for display on the provider profile + booking
 * flow. Refund tiers mirror the rules enforced in
 * src/app/api/bookings/[id]/route.ts (DELETE handler).
 */
export function describeCancellationPolicy(
  type: string | null | undefined,
  customText: string | null | undefined = null,
): CancellationPolicySummary {
  const normalised = normaliseCancellationPolicyType(type)
  switch (normalised) {
    case 'FLEXIBLE':
      return {
        type: normalised,
        label: 'Flexible',
        headline: 'Full refund up to 6 hours before the appointment.',
        tiers: [
          { window: 'More than 6 hours before', refund: 'Full refund' },
          { window: 'Within 6 hours', refund: 'No refund' },
        ],
        customText: customText?.trim() || null,
      }
    case 'STRICT':
      return {
        type: normalised,
        label: 'Strict',
        headline: 'Full refund only if cancelled 48+ hours before the appointment.',
        tiers: [
          { window: 'More than 48 hours before', refund: 'Full refund' },
          { window: '24–48 hours before', refund: '50% refund' },
          { window: 'Within 24 hours', refund: 'No refund' },
        ],
        customText: customText?.trim() || null,
      }
    case 'MODERATE':
    default:
      return {
        type: 'MODERATE',
        label: 'Moderate',
        headline: 'Full refund up to 24 hours before the appointment.',
        tiers: [
          { window: 'More than 24 hours before', refund: 'Full refund' },
          { window: 'Within 24 hours', refund: '50% refund' },
        ],
        customText: customText?.trim() || null,
      }
  }
}
