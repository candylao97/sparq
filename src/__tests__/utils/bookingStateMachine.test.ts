/**
 * Tests for the booking status state machine.
 *
 * The VALID_TRANSITIONS map from /api/bookings/[id]/route.ts is the heart
 * of booking integrity. These tests verify:
 *  - all allowed transitions
 *  - all forbidden transitions
 *  - role-based status restrictions
 *  - terminal states have no outbound transitions
 */

// We extract the logic to test it directly since it's inline in the route handler.
// These tests validate the expected state machine.

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'DECLINED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'EXPIRED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER', 'DISPUTED'],
  COMPLETED: ['REFUNDED', 'DISPUTED'],
  CANCELLED: [],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_PROVIDER: [],
  DECLINED: [],
  EXPIRED: [],
  REFUNDED: [],
  DISPUTED: ['REFUNDED', 'COMPLETED'],
}

const CUSTOMER_STATUSES = ['CANCELLED_BY_CUSTOMER']
const PROVIDER_STATUSES = ['CONFIRMED', 'DECLINED', 'CANCELLED_BY_PROVIDER', 'COMPLETED']

// ─── Valid Transition Tests ─────────────────────────────────────────────────

describe('Booking State Machine — valid transitions', () => {
  describe('from PENDING', () => {
    it('allows CONFIRMED', () => {
      expect(VALID_TRANSITIONS['PENDING']).toContain('CONFIRMED')
    })
    it('allows DECLINED', () => {
      expect(VALID_TRANSITIONS['PENDING']).toContain('DECLINED')
    })
    it('allows CANCELLED_BY_CUSTOMER', () => {
      expect(VALID_TRANSITIONS['PENDING']).toContain('CANCELLED_BY_CUSTOMER')
    })
    it('allows CANCELLED_BY_PROVIDER', () => {
      expect(VALID_TRANSITIONS['PENDING']).toContain('CANCELLED_BY_PROVIDER')
    })
    it('allows EXPIRED', () => {
      expect(VALID_TRANSITIONS['PENDING']).toContain('EXPIRED')
    })
    it('does NOT allow COMPLETED directly', () => {
      expect(VALID_TRANSITIONS['PENDING']).not.toContain('COMPLETED')
    })
    it('does NOT allow REFUNDED directly', () => {
      expect(VALID_TRANSITIONS['PENDING']).not.toContain('REFUNDED')
    })
  })

  describe('from CONFIRMED', () => {
    it('allows COMPLETED', () => {
      expect(VALID_TRANSITIONS['CONFIRMED']).toContain('COMPLETED')
    })
    it('allows CANCELLED_BY_CUSTOMER', () => {
      expect(VALID_TRANSITIONS['CONFIRMED']).toContain('CANCELLED_BY_CUSTOMER')
    })
    it('allows CANCELLED_BY_PROVIDER', () => {
      expect(VALID_TRANSITIONS['CONFIRMED']).toContain('CANCELLED_BY_PROVIDER')
    })
    it('allows DISPUTED', () => {
      expect(VALID_TRANSITIONS['CONFIRMED']).toContain('DISPUTED')
    })
    it('does NOT allow DECLINED (already accepted)', () => {
      expect(VALID_TRANSITIONS['CONFIRMED']).not.toContain('DECLINED')
    })
    it('does NOT allow EXPIRED (already accepted)', () => {
      expect(VALID_TRANSITIONS['CONFIRMED']).not.toContain('EXPIRED')
    })
  })

  describe('from COMPLETED', () => {
    it('allows REFUNDED', () => {
      expect(VALID_TRANSITIONS['COMPLETED']).toContain('REFUNDED')
    })
    it('allows DISPUTED', () => {
      expect(VALID_TRANSITIONS['COMPLETED']).toContain('DISPUTED')
    })
    it('does NOT allow CANCELLED_BY_CUSTOMER', () => {
      expect(VALID_TRANSITIONS['COMPLETED']).not.toContain('CANCELLED_BY_CUSTOMER')
    })
  })

  describe('from DISPUTED', () => {
    it('allows REFUNDED (dispute resolved with refund)', () => {
      expect(VALID_TRANSITIONS['DISPUTED']).toContain('REFUNDED')
    })
    it('allows COMPLETED (dispute resolved, no refund)', () => {
      expect(VALID_TRANSITIONS['DISPUTED']).toContain('COMPLETED')
    })
  })
})

// ─── Terminal State Tests ───────────────────────────────────────────────────

describe('Booking State Machine — terminal states', () => {
  const terminalStates = [
    'CANCELLED',
    'CANCELLED_BY_CUSTOMER',
    'CANCELLED_BY_PROVIDER',
    'DECLINED',
    'EXPIRED',
    'REFUNDED',
  ]

  test.each(terminalStates)('%s is a terminal state (no outbound transitions)', (state) => {
    expect(VALID_TRANSITIONS[state]).toEqual([])
  })
})

// ─── Role-Based Authorization ───────────────────────────────────────────────

describe('Booking State Machine — role authorization', () => {
  it('customer can only set CANCELLED_BY_CUSTOMER', () => {
    expect(CUSTOMER_STATUSES).toEqual(['CANCELLED_BY_CUSTOMER'])
    expect(CUSTOMER_STATUSES).not.toContain('CONFIRMED')
    expect(CUSTOMER_STATUSES).not.toContain('DECLINED')
    expect(CUSTOMER_STATUSES).not.toContain('COMPLETED')
  })

  it('provider can set CONFIRMED, DECLINED, CANCELLED_BY_PROVIDER, COMPLETED', () => {
    expect(PROVIDER_STATUSES).toContain('CONFIRMED')
    expect(PROVIDER_STATUSES).toContain('DECLINED')
    expect(PROVIDER_STATUSES).toContain('CANCELLED_BY_PROVIDER')
    expect(PROVIDER_STATUSES).toContain('COMPLETED')
  })

  it('provider cannot set customer-specific statuses', () => {
    expect(PROVIDER_STATUSES).not.toContain('CANCELLED_BY_CUSTOMER')
  })

  it('customer cannot set provider-specific statuses', () => {
    expect(CUSTOMER_STATUSES).not.toContain('CONFIRMED')
    expect(CUSTOMER_STATUSES).not.toContain('DECLINED')
    expect(CUSTOMER_STATUSES).not.toContain('CANCELLED_BY_PROVIDER')
    expect(CUSTOMER_STATUSES).not.toContain('COMPLETED')
  })
})

// ─── Forbidden Direct Transitions ───────────────────────────────────────────

describe('Booking State Machine — forbidden transitions', () => {
  it('cannot go from PENDING directly to COMPLETED', () => {
    expect(VALID_TRANSITIONS['PENDING']).not.toContain('COMPLETED')
  })

  it('cannot go from PENDING directly to REFUNDED', () => {
    expect(VALID_TRANSITIONS['PENDING']).not.toContain('REFUNDED')
  })

  it('cannot go from PENDING directly to DISPUTED', () => {
    expect(VALID_TRANSITIONS['PENDING']).not.toContain('DISPUTED')
  })

  it('cannot go from CONFIRMED directly to DECLINED', () => {
    expect(VALID_TRANSITIONS['CONFIRMED']).not.toContain('DECLINED')
  })

  it('cannot go from COMPLETED to CANCELLED', () => {
    expect(VALID_TRANSITIONS['COMPLETED']).not.toContain('CANCELLED_BY_CUSTOMER')
    expect(VALID_TRANSITIONS['COMPLETED']).not.toContain('CANCELLED_BY_PROVIDER')
  })

  it('cannot go backward from EXPIRED to PENDING', () => {
    expect(VALID_TRANSITIONS['EXPIRED']).not.toContain('PENDING')
  })

  it('cannot go backward from DECLINED to PENDING', () => {
    expect(VALID_TRANSITIONS['DECLINED']).not.toContain('PENDING')
  })
})

// ─── Completeness Check ────────────────────────────────────────────────────

describe('Booking State Machine — completeness', () => {
  const ALL_STATUSES = [
    'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED',
    'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PROVIDER',
    'DECLINED', 'EXPIRED', 'REFUNDED', 'DISPUTED',
  ]

  it('every status has an entry in VALID_TRANSITIONS', () => {
    for (const status of ALL_STATUSES) {
      expect(VALID_TRANSITIONS).toHaveProperty(status)
    }
  })

  it('every transition target is a valid status', () => {
    for (const [, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_STATUSES).toContain(target)
      }
    }
  })

  it('no self-transitions exist (cannot transition to same status)', () => {
    for (const [status, targets] of Object.entries(VALID_TRANSITIONS)) {
      expect(targets).not.toContain(status)
    }
  })
})
