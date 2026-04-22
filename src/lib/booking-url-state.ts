/**
 * AUDIT-006 helpers
 *
 * Pure functions for reading and writing the booking-wizard state in the URL.
 * Extracted from `src/app/book/[providerId]/page.tsx` so that the parsing /
 * serialisation logic can be unit-tested without rendering the page.
 *
 * The booking page uses these to:
 *   1. Hydrate wizard state from the URL on mount (so returning from the
 *      login redirect restores the user's progress).
 *   2. Mirror wizard state back to the URL on every change (so the current
 *      URL is always a shareable/returnable snapshot).
 *
 * Sensitive/large fields (address, notes) are deliberately NOT round-tripped.
 */

export type BookingLocationType = '' | 'AT_HOME' | 'STUDIO'

export interface BookingUrlState {
  serviceId: string | null
  date: string
  time: string
  locationType: BookingLocationType
  tip: number
  guestCount: number
  selectedAddons: string[]
  voucherInput: string
  promoCode: string
  step: number
}

interface ParamsLike {
  get(name: string): string | null
}

/**
 * Parse a URLSearchParams-like object into a fully-populated BookingUrlState.
 * Unknown or malformed values fall back to safe defaults — the UI should always
 * be in a usable state regardless of what the URL contains.
 */
export function parseBookingUrlState(params: ParamsLike): BookingUrlState {
  const locRaw = params.get('locationType')
  const locationType: BookingLocationType =
    locRaw === 'AT_HOME' || locRaw === 'STUDIO' ? locRaw : ''

  const stepRaw = Number(params.get('step')) || 1
  const step = stepRaw >= 1 && stepRaw <= 3 ? stepRaw : 1

  const addonsRaw = params.get('addons')
  const selectedAddons = addonsRaw ? addonsRaw.split(',').filter(Boolean) : []

  return {
    serviceId:      params.get('service'),
    date:           params.get('date') ?? '',
    time:           params.get('time') ?? '',
    locationType,
    tip:            Math.max(0, Number(params.get('tip'))    || 0),
    guestCount:     Math.max(1, Number(params.get('guests')) || 1),
    selectedAddons,
    voucherInput:   params.get('voucher') ?? '',
    promoCode:      params.get('promo')   ?? '',
    step,
  }
}

export interface BookingUrlInputs {
  serviceId: string | null
  date: string
  time: string
  locationType: BookingLocationType
  tip: number
  guestCount: number
  selectedAddons: string[]
  voucherInput: string
  promoCode: string
  step: number
}

/**
 * Serialise the current wizard state into a URLSearchParams string.
 * Empty / default values are omitted to keep the URL short and readable.
 */
export function serializeBookingUrlState(input: BookingUrlInputs): string {
  const qp = new URLSearchParams()
  if (input.serviceId)              qp.set('service',      input.serviceId)
  if (input.date)                   qp.set('date',         input.date)
  if (input.time)                   qp.set('time',         input.time)
  if (input.locationType)           qp.set('locationType', input.locationType)
  if (input.tip > 0)                qp.set('tip',          String(input.tip))
  if (input.guestCount > 1)         qp.set('guests',       String(input.guestCount))
  if (input.selectedAddons.length)  qp.set('addons',       input.selectedAddons.join(','))
  if (input.voucherInput)           qp.set('voucher',      input.voucherInput)
  if (input.promoCode)              qp.set('promo',        input.promoCode)
  if (input.step > 1)               qp.set('step',         String(input.step))
  return qp.toString()
}

/**
 * Compose a `/book/:providerId` URL with the serialised state appended
 * as the query string. Used to drive `router.replace` from the booking page
 * and to build the callbackUrl that /login redirects back to.
 */
export function buildBookingUrl(providerId: string, input: BookingUrlInputs): string {
  const qs = serializeBookingUrlState(input)
  return qs ? `/book/${providerId}?${qs}` : `/book/${providerId}`
}
