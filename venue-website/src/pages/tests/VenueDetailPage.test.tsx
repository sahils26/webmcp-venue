import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QUOTE_SUCCESS_RESET_DELAY_MS } from '../../features/quote/quoteTiming'
import { renderWithProviders } from '../../tests/renderWithProviders'
import VenueDetailPage from '../VenueDetailPage'
import VenuePage from '../VenuePage'

function renderVenueDetailPage(initialEntry = '/venues/grand-hall') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<VenuePage />} />
        <Route path="/venues/:venueId" element={<VenueDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VenueDetailPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a full detail page for a selected venue', () => {
    renderVenueDetailPage()

    expect(screen.getByRole('heading', { name: 'The Grand Hall', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByText('Up to 150 guests').length).toBeGreaterThan(0)
    expect(screen.getByText('€1,200 / day')).toBeInTheDocument()
    expect(screen.getAllByText('Professional Projector & Screen').length).toBeGreaterThan(0)

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    expect(within(quotePanel).getByRole('heading', { name: 'Request a Quote' })).toBeInTheDocument()
    expect(within(quotePanel).getByLabelText('Venue')).toHaveValue('The Grand Hall')
    expect(within(quotePanel).getByLabelText('Venue')).toHaveAttribute('readonly')
    expect(within(quotePanel).getByLabelText('Date')).toHaveAttribute('readonly')
    expect(within(quotePanel).queryByText(/payment/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plan With Clear Availability' })).toBeInTheDocument()
  })

  it('validates the detail-page quote form before submitting', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quotePanel).getByRole('button', { name: 'Submit Quote Request' }))

    expect(within(quotePanel).getByText('Please choose a valid event date.')).toBeInTheDocument()
    expect(within(quotePanel).getByRole('alert')).toHaveClass('quote-status--error')
  })

  it('shows success, clears the detail quote form, and keeps the selected date blocked', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.click(
      within(quotePanel).getByRole('button', { name: /June 22, 2026, available/ }),
    )
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    vi.useFakeTimers()
    fireEvent.click(within(quotePanel).getByRole('button', { name: 'Submit Quote Request' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(
      within(quotePanel).getByText(
        'Quote requested for The Grand Hall on 2026-06-22 by planner@example.com. The date is now held.',
      ),
    ).toBeInTheDocument()
    expect(within(quotePanel).getByRole('status')).toHaveClass('quote-status--success')
    expect(
      within(quotePanel).getByRole('button', { name: /June 22, 2026, booked/ }),
    ).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(QUOTE_SUCCESS_RESET_DELAY_MS)
    })
    vi.useRealTimers()

    expect(within(quotePanel).getByLabelText('Venue')).toHaveValue('The Grand Hall')
    expect(within(quotePanel).getByLabelText('Date')).toHaveValue('')
    expect(within(quotePanel).getByLabelText('Your Email')).toHaveValue('')
    expect(
      within(quotePanel).queryByText(
        'Quote requested for The Grand Hall on 2026-06-22 by planner@example.com. The date is now held.',
      ),
    ).not.toBeInTheDocument()
    expect(
      within(quotePanel).getByRole('button', { name: /June 22, 2026, booked/ }),
    ).toBeDisabled()
  })

  it('shows a detail-page quote hold as blocked on the homepage', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.click(
      within(quotePanel).getByRole('button', { name: /June 22, 2026, available/ }),
    )
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quotePanel).getByRole('button', { name: 'Submit Quote Request' }))
    await user.click(screen.getByRole('link', { name: 'Browse all spaces' }))

    const homepageQuoteSection = screen.getByRole('region', { name: 'Request a Quote' })
    await user.click(within(homepageQuoteSection).getByLabelText('Venue'))
    await user.click(
      within(homepageQuoteSection).getByRole('option', { name: /The Grand Hall/ }),
    )

    expect(
      within(homepageQuoteSection).getByRole('button', { name: /June 22, 2026, booked/ }),
    ).toBeDisabled()
    expect(
      within(homepageQuoteSection).queryByRole('button', { name: /June 22, 2026, available/ }),
    ).not.toBeInTheDocument()
  })

  it('renders a helpful fallback for unknown venue routes', () => {
    renderVenueDetailPage('/venues/not-a-real-space')

    expect(
      screen.getByRole('heading', { name: 'This space is no longer available.' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Browse Spaces' })[0]).toHaveAttribute(
      'href',
      '/#venues',
    )
  })
})
