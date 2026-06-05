import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
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
    expect(within(quotePanel).getByRole('heading', { name: 'Reserve This Venue' })).toBeInTheDocument()
    expect(within(quotePanel).getByLabelText('Venue')).toHaveValue('The Grand Hall')
    expect(within(quotePanel).getByLabelText('Venue')).toHaveAttribute('readonly')
    expect(within(quotePanel).getByLabelText('Date')).toHaveAttribute('readonly')
    expect(screen.getByRole('heading', { name: 'Plan With Clear Availability' })).toBeInTheDocument()
  })

  it('validates the detail-page quote form before submitting', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quotePanel).getByRole('button', { name: 'Continue to Payment' }))

    expect(within(quotePanel).getByText('Please choose a valid event date.')).toBeInTheDocument()
  })

  it('continues to payment for the locked detail-page venue', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.click(
      within(quotePanel).getByRole('button', { name: /June 15, 2026, available/ }),
    )
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quotePanel).getByRole('button', { name: 'Continue to Payment' }))

    expect(within(quotePanel).getByRole('heading', { name: 'Complete Booking' })).toBeInTheDocument()
    expect(within(quotePanel).getByText('€1,200')).toBeInTheDocument()
  })

  it('shows a success notification after confirming payment', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.click(
      within(quotePanel).getByRole('button', { name: /June 15, 2026, available/ }),
    )
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quotePanel).getByRole('button', { name: 'Continue to Payment' }))
    await user.click(within(quotePanel).getByRole('button', { name: 'Confirm Payment' }))

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Your payment is successful.')
    expect(toast).toHaveTextContent(
      'We will shortly send the confirmation document to planner@example.com.',
    )
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
