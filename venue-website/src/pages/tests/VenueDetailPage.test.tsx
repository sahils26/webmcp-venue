import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../tests/renderWithProviders'
import VenueDetailPage from '../VenueDetailPage'

function renderVenueDetailPage(initialEntry = '/venues/grand-hall') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/venues/:venueId" element={<VenueDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VenueDetailPage', () => {
  it('renders a full detail page for a selected venue', () => {
    renderVenueDetailPage()

    expect(screen.getByRole('heading', { name: 'The Grand Hall', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Up to 150 guests')).toBeInTheDocument()
    expect(screen.getByText('€1,200 / day')).toBeInTheDocument()
    expect(screen.getByText('Professional Projector & Screen')).toBeInTheDocument()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    expect(within(quotePanel).getByRole('heading', { name: 'Request a Quote' })).toBeInTheDocument()
    expect(within(quotePanel).getByLabelText('Venue')).toHaveValue('The Grand Hall')
    expect(within(quotePanel).getByLabelText('Venue')).toHaveAttribute('readonly')
    expect(within(quotePanel).getByLabelText('Date')).toHaveAttribute('min')
  })

  it('validates the detail-page quote form before submitting', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.type(within(quotePanel).getByLabelText('Date'), '2020-01-01')
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quotePanel).getByRole('button', { name: 'Submit Quote Request' }))

    expect(within(quotePanel).getByText('Please choose today or a future date.')).toBeInTheDocument()
  })

  it('submits a quote request for the locked detail-page venue', async () => {
    const user = userEvent.setup()
    renderVenueDetailPage()

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    await user.type(within(quotePanel).getByLabelText('Date'), '2026-06-15')
    await user.type(within(quotePanel).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quotePanel).getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      within(quotePanel).getByText(
        'Quote requested for The Grand Hall on 2026-06-15 by planner@example.com.',
      ),
    ).toBeInTheDocument()
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
