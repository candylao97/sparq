/**
 * AUDIT-004 — AvailabilityCalendar component tests.
 *
 * Covers:
 *  - Renders the current month and day grid
 *  - Fetches /api/providers/:id/availability?from=&to= on mount
 *  - Available dates render as clickable buttons
 *  - Past and unavailable dates render as non-interactive cells
 *  - Clicking an available date pushes to /book/:id with URL state
 *    (date pre-selected, step=2, defaultServiceId preserved)
 *  - Graceful degradation when the API returns an error
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvailabilityCalendar } from '@/components/providers/AvailabilityCalendar'

// ── Mocks ───────────────────────────────────────────────────────────────────

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn() }),
}))

const originalFetch = global.fetch

beforeEach(() => {
  pushMock.mockClear()
})

afterEach(() => {
  global.fetch = originalFetch as typeof fetch
})

function mockAvailability(availableDates: string[]) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ availableDates }),
    }),
  ) as unknown as typeof fetch
}

function mockAvailabilityError() {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({}),
    }),
  ) as unknown as typeof fetch
}

// Helper: the first day of the *next* month from today — guaranteed to be
// in the future and not "past" from the component's perspective.
function nextMonthFirstDay(): { y: number; m: number; dateStr: string } {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 1)
  const y = d.getFullYear()
  const m = d.getMonth()
  const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { y, m, dateStr }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AvailabilityCalendar — rendering', () => {
  it('renders a heading that includes the artist name', async () => {
    mockAvailability([])
    render(<AvailabilityCalendar providerId="prov-1" artistFirstName="Lily" />)
    expect(screen.getByText(/Lily's availability/i)).toBeInTheDocument()
  })

  it('falls back to a generic heading when no artist name is provided', async () => {
    mockAvailability([])
    render(<AvailabilityCalendar providerId="prov-1" />)
    expect(screen.getByText(/^Availability$/i)).toBeInTheDocument()
  })

  it('renders seven day-of-week header cells', async () => {
    mockAvailability([])
    render(<AvailabilityCalendar providerId="prov-1" />)
    // The component marks day labels with aria-hidden="true"; there are 7.
    const container = screen.getByLabelText('Availability calendar')
    const labels = container.querySelectorAll('.grid-cols-7 > .text-xs.font-semibold')
    expect(labels.length).toBe(7)
  })
})

describe('AvailabilityCalendar — fetching', () => {
  it('calls the availability API with a from/to date range on mount', async () => {
    mockAvailability([])
    render(<AvailabilityCalendar providerId="prov-abc" />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toMatch(/^\/api\/providers\/prov-abc\/availability\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/)
  })

  it('shows an error message when the API returns !ok', async () => {
    mockAvailabilityError()
    render(<AvailabilityCalendar providerId="prov-1" />)
    await waitFor(() => {
      expect(screen.getByText(/Could not load availability/i)).toBeInTheDocument()
    })
  })
})

describe('AvailabilityCalendar — date interaction', () => {
  it('renders available dates as clickable buttons', async () => {
    const { dateStr } = nextMonthFirstDay()
    mockAvailability([dateStr])
    render(<AvailabilityCalendar providerId="prov-1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    // Navigate to next month to see our available date
    fireEvent.click(screen.getByLabelText('Next month'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    const availableBtn = await screen.findByRole('gridcell', {
      name: new RegExp(`${dateStr} — available`),
    })
    expect(availableBtn.tagName.toLowerCase()).toBe('button')
  })

  it('clicking an available date navigates to /book with URL state', async () => {
    const { dateStr } = nextMonthFirstDay()
    mockAvailability([dateStr])
    render(
      <AvailabilityCalendar
        providerId="prov-1"
        defaultServiceId="svc-xyz"
      />,
    )
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    fireEvent.click(screen.getByLabelText('Next month'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    const availableBtn = await screen.findByRole('gridcell', {
      name: new RegExp(`${dateStr} — available`),
    })
    fireEvent.click(availableBtn)

    expect(pushMock).toHaveBeenCalledTimes(1)
    const pushedUrl = pushMock.mock.calls[0][0] as string
    expect(pushedUrl.startsWith('/book/prov-1?')).toBe(true)
    expect(pushedUrl).toContain(`date=${dateStr}`)
    expect(pushedUrl).toContain('service=svc-xyz')
    expect(pushedUrl).toContain('step=2')
  })

  it('does not render unavailable dates as buttons', async () => {
    mockAvailability([]) // nothing available
    render(<AvailabilityCalendar providerId="prov-1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    // No gridcells with "available" label
    const availableCells = screen.queryAllByRole('gridcell', { name: /available, tap/ })
    expect(availableCells.length).toBe(0)
  })
})

describe('AvailabilityCalendar — navigation', () => {
  it('disables the prev-month button when viewing the current month', async () => {
    mockAvailability([])
    render(<AvailabilityCalendar providerId="prov-1" />)
    const prev = screen.getByLabelText('Previous month') as HTMLButtonElement
    expect(prev.disabled).toBe(true)
  })

  it('enables the prev-month button after moving forward one month', async () => {
    mockAvailability([])
    render(<AvailabilityCalendar providerId="prov-1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    fireEvent.click(screen.getByLabelText('Next month'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    const prev = screen.getByLabelText('Previous month') as HTMLButtonElement
    expect(prev.disabled).toBe(false)
  })

  it('refetches availability when the visible month changes', async () => {
    mockAvailability([])
    render(<AvailabilityCalendar providerId="prov-1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByLabelText('Next month'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    // The second call should be for a *different* month
    const url1 = (global.fetch as jest.Mock).mock.calls[0][0] as string
    const url2 = (global.fetch as jest.Mock).mock.calls[1][0] as string
    expect(url1).not.toBe(url2)
  })
})
