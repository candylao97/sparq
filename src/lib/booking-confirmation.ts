/**
 * Booking confirmation page — mode + copy helpers.
 *
 * Fixes AUDIT-005: the confirmation page previously always showed
 * "Booking request sent!" regardless of whether the booking was instant-book
 * (status = CONFIRMED) or awaiting artist acceptance (status = PENDING).
 * This module centralises the branching logic so the UI and any tests can
 * share a single source of truth.
 *
 * Mode precedence:
 *   1. `failed`    — paymentStatus === 'FAILED'. Most actionable — retry UI.
 *   2. `confirmed` — status === 'CONFIRMED' (instant-book or provider-accepted).
 *   3. `pending`   — default / status === 'PENDING' (awaiting artist acceptance).
 *
 * Other statuses (COMPLETED, CANCELLED, DECLINED, etc.) should never land on
 * the confirmation page in normal flow, but we default them to `pending` so
 * the page never hard-fails if someone deep-links in post-hoc.
 */

export type ConfirmationMode = 'confirmed' | 'pending' | 'failed'

export interface ConfirmationModeInput {
  /** Booking.status (BookingStatus enum). */
  status: string
  /** Booking.paymentStatus (PaymentStatus enum). Optional — $0 bookings have none. */
  paymentStatus?: string | null
}

/**
 * Resolves which confirmation mode to render for a booking.
 *
 * @see ConfirmationMode for precedence rules.
 */
export function getConfirmationMode(booking: ConfirmationModeInput): ConfirmationMode {
  if (booking.paymentStatus === 'FAILED') return 'failed'
  if (booking.status === 'CONFIRMED') return 'confirmed'
  return 'pending'
}

/**
 * Copy bundle rendered on the confirmation page. Keeping these as plain data
 * (no JSX) so they can be unit-tested and snapshotted without a DOM.
 */
export interface ConfirmationCopy {
  /** Main H1. */
  headline: string
  /** Sub-text below the headline. May reference {acceptDeadlineText} placeholder. */
  subtext: string
  /** Three-step "What happens next?" list. */
  nextSteps: { step: string; title: string; desc: string }[]
  /** Semantic icon key for the hero icon (mapped to a lucide icon in the page). */
  iconKey: 'check' | 'clock' | 'alert'
  /** Background tint class for the icon circle. */
  iconBgClass: string
  /** Foreground colour class for the icon. */
  iconColorClass: string
}

export interface ConfirmationCopyInput {
  mode: ConfirmationMode
  /** Artist first name, used in pending copy. Fallback if missing. */
  artistFirstName?: string
  /** Pre-formatted accept deadline string, e.g. "until Thursday 6pm". */
  acceptDeadlineText?: string
}

/**
 * Returns the full copy bundle for a given mode. Pure function; no JSX.
 *
 * NOTE on design: colour classes stay here (not in the page) so that copy
 * + visual grouping snapshot together. Changing the tint for "confirmed"
 * should be a one-line change and will show up in snapshot diffs.
 */
export function getConfirmationCopy(input: ConfirmationCopyInput): ConfirmationCopy {
  const { mode } = input
  const artistName = input.artistFirstName && input.artistFirstName.trim().length > 0
    ? input.artistFirstName
    : 'your artist'
  const deadlineText = input.acceptDeadlineText && input.acceptDeadlineText.trim().length > 0
    ? input.acceptDeadlineText
    : 'within 24 hours'

  if (mode === 'failed') {
    return {
      headline: 'Payment issue',
      subtext: 'Your booking is confirmed but payment could not be processed. Please retry below.',
      iconKey: 'alert',
      iconBgClass: 'bg-amber-100',
      iconColorClass: 'text-amber-500',
      // Failed mode reuses the pending steps — the important action is the retry banner above.
      nextSteps: [
        {
          step: '1',
          title: 'Update your payment method',
          desc: 'Use the retry button above to enter new card details.',
        },
        {
          step: '2',
          title: 'We\'ll confirm with the artist',
          desc: 'Once payment clears, your artist will be notified automatically.',
        },
        {
          step: '3',
          title: 'You\'ll get a confirmation',
          desc: 'We\'ll email you as soon as everything is set.',
        },
      ],
    }
  }

  if (mode === 'confirmed') {
    return {
      headline: 'Booking confirmed!',
      subtext: `You're all set — ${artistName} is looking forward to your appointment.`,
      iconKey: 'check',
      iconBgClass: 'bg-[#f3ece9]',
      iconColorClass: 'text-[#E96B56]',
      nextSteps: [
        {
          step: '1',
          title: 'Check your email',
          desc: 'We\'ve sent your booking details and a calendar invite.',
        },
        {
          step: '2',
          title: 'Prep for your appointment',
          desc: 'Add it to your calendar so you don\'t miss it — links below.',
        },
        {
          step: '3',
          title: 'Enjoy your visit',
          desc: 'After your appointment, you\'ll be able to leave a review.',
        },
      ],
    }
  }

  // mode === 'pending'
  return {
    headline: 'Booking request sent!',
    subtext: `${artistName[0].toUpperCase() + artistName.slice(1)} has ${deadlineText} to accept your request.`,
    iconKey: 'clock',
    iconBgClass: 'bg-[#f3ece9]',
    iconColorClass: 'text-[#E96B56]',
    nextSteps: [
      {
        step: '1',
        title: 'Artist reviews your request',
        desc: `Your artist has up to ${deadlineText} to confirm or decline.`,
      },
      {
        step: '2',
        title: 'You\'ll get a notification',
        desc: 'We\'ll notify you by email as soon as they respond.',
      },
      {
        step: '3',
        title: 'Payment only on confirmation',
        desc: 'Your card is only charged once your artist confirms the booking.',
      },
    ],
  }
}
