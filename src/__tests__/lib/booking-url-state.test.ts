/**
 * Tests for the AUDIT-006 URL-state helpers.
 *
 * These cover the round-trip contract between
 *   parseBookingUrlState  (URL  → state)
 *   serializeBookingUrlState (state → URL)
 *   buildBookingUrl       (composes the full /book/:id?… path)
 *
 * The core property the booking page relies on is that any state the user
 * entered (date, time, tip, addons, voucher, etc.) survives a login redirect
 * round-trip: we serialise → redirect carries the query string → parse reads
 * it back into identical state.
 */

import {
  parseBookingUrlState,
  serializeBookingUrlState,
  buildBookingUrl,
  buildRetryBookingUrl,
} from '@/lib/booking-url-state'

function p(qs: string): URLSearchParams {
  return new URLSearchParams(qs)
}

describe('parseBookingUrlState', () => {
  it('returns safe defaults for an empty query string', () => {
    const s = parseBookingUrlState(p(''))
    expect(s.serviceId).toBeNull()
    expect(s.date).toBe('')
    expect(s.time).toBe('')
    expect(s.locationType).toBe('')
    expect(s.tip).toBe(0)
    expect(s.guestCount).toBe(1)
    expect(s.selectedAddons).toEqual([])
    expect(s.voucherInput).toBe('')
    expect(s.promoCode).toBe('')
    expect(s.step).toBe(1)
  })

  it('reads the serviceId when present', () => {
    expect(parseBookingUrlState(p('service=abc-123')).serviceId).toBe('abc-123')
  })

  it('passes through date and time strings verbatim', () => {
    const s = parseBookingUrlState(p('date=2026-05-01&time=14:30'))
    expect(s.date).toBe('2026-05-01')
    expect(s.time).toBe('14:30')
  })

  it('accepts AT_HOME as a valid locationType', () => {
    expect(parseBookingUrlState(p('locationType=AT_HOME')).locationType).toBe('AT_HOME')
  })

  it('accepts STUDIO as a valid locationType', () => {
    expect(parseBookingUrlState(p('locationType=STUDIO')).locationType).toBe('STUDIO')
  })

  it('ignores unknown locationType values', () => {
    expect(parseBookingUrlState(p('locationType=HOTEL')).locationType).toBe('')
    expect(parseBookingUrlState(p('locationType=')).locationType).toBe('')
  })

  it('coerces tip to a non-negative number', () => {
    expect(parseBookingUrlState(p('tip=20')).tip).toBe(20)
    expect(parseBookingUrlState(p('tip=-5')).tip).toBe(0)
    expect(parseBookingUrlState(p('tip=abc')).tip).toBe(0)
  })

  it('coerces guests to at-least-1', () => {
    expect(parseBookingUrlState(p('guests=4')).guestCount).toBe(4)
    expect(parseBookingUrlState(p('guests=0')).guestCount).toBe(1)
    expect(parseBookingUrlState(p('guests=-2')).guestCount).toBe(1)
    expect(parseBookingUrlState(p('guests=nope')).guestCount).toBe(1)
  })

  it('splits addons on commas', () => {
    expect(parseBookingUrlState(p('addons=a,b,c')).selectedAddons).toEqual(['a', 'b', 'c'])
  })

  it('drops empty addon entries', () => {
    expect(parseBookingUrlState(p('addons=a,,b,')).selectedAddons).toEqual(['a', 'b'])
  })

  it('returns an empty addon list when addons param is missing', () => {
    expect(parseBookingUrlState(p('')).selectedAddons).toEqual([])
  })

  it('reads voucher and promo codes', () => {
    const s = parseBookingUrlState(p('voucher=GIFT50&promo=SPRING20'))
    expect(s.voucherInput).toBe('GIFT50')
    expect(s.promoCode).toBe('SPRING20')
  })

  it('clamps step to the valid 1..3 range', () => {
    expect(parseBookingUrlState(p('step=1')).step).toBe(1)
    expect(parseBookingUrlState(p('step=2')).step).toBe(2)
    expect(parseBookingUrlState(p('step=3')).step).toBe(3)
    expect(parseBookingUrlState(p('step=0')).step).toBe(1)
    expect(parseBookingUrlState(p('step=99')).step).toBe(1)
    expect(parseBookingUrlState(p('step=bad')).step).toBe(1)
  })
})

describe('serializeBookingUrlState', () => {
  const empty = {
    serviceId: null,
    date: '',
    time: '',
    locationType: '' as const,
    tip: 0,
    guestCount: 1,
    selectedAddons: [],
    voucherInput: '',
    promoCode: '',
    step: 1,
  }

  it('returns an empty string for fully-default state', () => {
    expect(serializeBookingUrlState(empty)).toBe('')
  })

  it('omits tip when zero', () => {
    expect(serializeBookingUrlState({ ...empty, tip: 0 })).toBe('')
  })

  it('includes tip when positive', () => {
    expect(serializeBookingUrlState({ ...empty, tip: 15 })).toBe('tip=15')
  })

  it('omits guests when equal to 1', () => {
    expect(serializeBookingUrlState({ ...empty, guestCount: 1 })).toBe('')
  })

  it('includes guests when greater than 1', () => {
    expect(serializeBookingUrlState({ ...empty, guestCount: 3 })).toBe('guests=3')
  })

  it('omits step when equal to 1', () => {
    expect(serializeBookingUrlState({ ...empty, step: 1 })).toBe('')
  })

  it('includes step when >1', () => {
    expect(serializeBookingUrlState({ ...empty, step: 3 })).toBe('step=3')
  })

  it('joins addon IDs with commas', () => {
    const out = serializeBookingUrlState({ ...empty, selectedAddons: ['x', 'y'] })
    expect(out).toBe('addons=x%2Cy')
  })

  it('includes all fields when populated', () => {
    const out = serializeBookingUrlState({
      serviceId: 'svc-1',
      date: '2026-06-01',
      time: '10:00',
      locationType: 'AT_HOME',
      tip: 10,
      guestCount: 2,
      selectedAddons: ['add-1'],
      voucherInput: 'GIFT',
      promoCode: 'WELCOME',
      step: 2,
    })
    expect(out).toContain('service=svc-1')
    expect(out).toContain('date=2026-06-01')
    expect(out).toContain('time=10%3A00')
    expect(out).toContain('locationType=AT_HOME')
    expect(out).toContain('tip=10')
    expect(out).toContain('guests=2')
    expect(out).toContain('addons=add-1')
    expect(out).toContain('voucher=GIFT')
    expect(out).toContain('promo=WELCOME')
    expect(out).toContain('step=2')
  })
})

describe('parse ↔ serialize round-trip (AUDIT-006 contract)', () => {
  it('round-trips a fully-populated booking state', () => {
    const original = {
      serviceId: 'svc-abc',
      date: '2026-07-04',
      time: '09:30',
      locationType: 'STUDIO' as const,
      tip: 25,
      guestCount: 2,
      selectedAddons: ['addon-1', 'addon-2'],
      voucherInput: 'GIFT100',
      promoCode: 'SUMMER',
      step: 3,
    }
    const qs = serializeBookingUrlState(original)
    const parsed = parseBookingUrlState(p(qs))
    expect(parsed).toEqual({
      serviceId: 'svc-abc',
      date: '2026-07-04',
      time: '09:30',
      locationType: 'STUDIO',
      tip: 25,
      guestCount: 2,
      selectedAddons: ['addon-1', 'addon-2'],
      voucherInput: 'GIFT100',
      promoCode: 'SUMMER',
      step: 3,
    })
  })

  it('round-trips an at-home Step-2 state', () => {
    const original = {
      serviceId: 'svc-1',
      date: '2026-08-15',
      time: '14:00',
      locationType: 'AT_HOME' as const,
      tip: 0,
      guestCount: 1,
      selectedAddons: [] as string[],
      voucherInput: '',
      promoCode: '',
      step: 2,
    }
    const parsed = parseBookingUrlState(p(serializeBookingUrlState(original)))
    expect(parsed.date).toBe('2026-08-15')
    expect(parsed.time).toBe('14:00')
    expect(parsed.locationType).toBe('AT_HOME')
    expect(parsed.step).toBe(2)
  })
})

describe('buildBookingUrl', () => {
  const emptyInputs = {
    serviceId: null,
    date: '',
    time: '',
    locationType: '' as const,
    tip: 0,
    guestCount: 1,
    selectedAddons: [],
    voucherInput: '',
    promoCode: '',
    step: 1,
  }

  it('returns /book/:id with no query string for default state', () => {
    expect(buildBookingUrl('prov-1', emptyInputs)).toBe('/book/prov-1')
  })

  it('appends the query string for populated state', () => {
    const url = buildBookingUrl('prov-1', { ...emptyInputs, date: '2026-01-01', step: 2 })
    expect(url.startsWith('/book/prov-1?')).toBe(true)
    expect(url).toContain('date=2026-01-01')
    expect(url).toContain('step=2')
  })

  it('makes a URL suitable as /login callbackUrl (preserves state)', () => {
    const url = buildBookingUrl('prov-xyz', {
      serviceId: 'svc-1',
      date: '2026-03-10',
      time: '11:00',
      locationType: 'AT_HOME',
      tip: 5,
      guestCount: 2,
      selectedAddons: ['a'],
      voucherInput: '',
      promoCode: '',
      step: 3,
    })
    // This is what we'd encode as callbackUrl in /login?callbackUrl=…
    const encoded = encodeURIComponent(url)
    // Round-trip: decode and parse the query string
    const decoded = decodeURIComponent(encoded)
    const qs = decoded.split('?')[1] ?? ''
    const parsed = parseBookingUrlState(new URLSearchParams(qs))
    expect(parsed.serviceId).toBe('svc-1')
    expect(parsed.date).toBe('2026-03-10')
    expect(parsed.time).toBe('11:00')
    expect(parsed.locationType).toBe('AT_HOME')
    expect(parsed.tip).toBe(5)
    expect(parsed.guestCount).toBe(2)
    expect(parsed.selectedAddons).toEqual(['a'])
    expect(parsed.step).toBe(3)
  })
})

describe('buildRetryBookingUrl (AUDIT-007)', () => {
  it('builds a retry URL that lands on Step 3 with preserved date/time/location', () => {
    const url = buildRetryBookingUrl({
      providerId:   'prov-1',
      serviceId:    'svc-abc',
      date:         '2026-05-20',
      time:         '13:00',
      locationType: 'AT_HOME',
      tipAmount:    10,
      guestCount:   2,
      giftVoucherCode: 'GIFT50',
    })
    expect(url.startsWith('/book/prov-1?')).toBe(true)
    const qs = url.split('?')[1] ?? ''
    const parsed = parseBookingUrlState(new URLSearchParams(qs))
    expect(parsed.serviceId).toBe('svc-abc')
    expect(parsed.date).toBe('2026-05-20')
    expect(parsed.time).toBe('13:00')
    expect(parsed.locationType).toBe('AT_HOME')
    expect(parsed.tip).toBe(10)
    expect(parsed.guestCount).toBe(2)
    expect(parsed.voucherInput).toBe('GIFT50')
    expect(parsed.step).toBe(3)
  })

  it('does not round-trip add-ons or promo codes (by design)', () => {
    const url = buildRetryBookingUrl({
      providerId:   'prov-1',
      serviceId:    'svc-1',
      date:         '2026-06-01',
      time:         '09:00',
      locationType: 'STUDIO',
    })
    const qs = url.split('?')[1] ?? ''
    const parsed = parseBookingUrlState(new URLSearchParams(qs))
    expect(parsed.selectedAddons).toEqual([])
    expect(parsed.promoCode).toBe('')
  })

  it('coerces missing guestCount to 1 (default)', () => {
    const url = buildRetryBookingUrl({
      providerId:   'prov-1',
      serviceId:    'svc-1',
      date:         '2026-06-01',
      time:         '09:00',
      locationType: 'STUDIO',
      guestCount:   null,
    })
    // guestCount=1 is omitted from the URL
    expect(url).not.toContain('guests=')
  })

  it('coerces negative tipAmount to 0', () => {
    const url = buildRetryBookingUrl({
      providerId:   'prov-1',
      serviceId:    'svc-1',
      date:         '2026-06-01',
      time:         '09:00',
      locationType: 'STUDIO',
      tipAmount:    -5,
    })
    expect(url).not.toContain('tip=')
  })

  it('treats unknown locationType as empty string', () => {
    const url = buildRetryBookingUrl({
      providerId:   'prov-1',
      serviceId:    'svc-1',
      date:         '2026-06-01',
      time:         '09:00',
      locationType: 'HOTEL' as string,
    })
    expect(url).not.toContain('locationType=')
  })

  it('omits voucher when no code present', () => {
    const url = buildRetryBookingUrl({
      providerId:   'prov-1',
      serviceId:    'svc-1',
      date:         '2026-06-01',
      time:         '09:00',
      locationType: 'STUDIO',
      giftVoucherCode: null,
    })
    expect(url).not.toContain('voucher=')
  })

  it('always sets step=3 so the user lands on Review & confirm', () => {
    const url = buildRetryBookingUrl({
      providerId:   'prov-1',
      serviceId:    'svc-1',
      date:         '2026-06-01',
      time:         '09:00',
      locationType: 'STUDIO',
    })
    expect(url).toContain('step=3')
  })
})
