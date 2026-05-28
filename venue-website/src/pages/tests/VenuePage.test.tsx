import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { callAgentTool, listAgentTools } from '../../lib/toolRegistry'
import { renderWithProviders } from '../../tests/renderWithProviders'
import type { AgentToolParams } from '../../types/agentTool'
import VenuePage from '../VenuePage'

function renderVenuePage() {
  return renderWithProviders(<VenuePage />)
}

async function waitForVenueTools(): Promise<void> {
  await waitFor(() => {
    expect(listAgentTools().map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'list_available_venues',
        'get_room_details',
        'prepare_quote_request',
        'check_availability',
        'get_pricing',
      ]),
    )
  })
}

async function callVenueTool(name: string, args: AgentToolParams): Promise<unknown> {
  let result: unknown

  await act(async () => {
    result = await callAgentTool(name, args)
  })

  return result
}

/**
 * Opens the first venue's details modal by clicking the first "SEE THE DETAILS" button
 * and waits for the dialog to appear.
 */
async function openFirstVenueModal(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const detailButtons = await screen.findAllByRole('button', { name: 'SEE THE DETAILS' })
  await user.click(detailButtons[0])
  await screen.findByRole('dialog')
}

describe('VenuePage', () => {
  it('renders venue showcase sections with all venue data immediately (no gate)', () => {
    renderVenuePage()

    // Hero is visible without any interaction
    expect(
      screen.getByRole('heading', { name: /TURN YOUR EVENT INTO A/i }),
    ).toBeInTheDocument()

    // All five venue showcase headings are present
    expect(screen.getByText('THE GRAND HALL')).toBeInTheDocument()
    expect(screen.getByText('SKYLINE LOFT')).toBeInTheDocument()
    expect(screen.getByText('ATELIER COURTYARD')).toBeInTheDocument()

    // Venue capacity appears in specs grid
    expect(screen.getByText('150 guests')).toBeInTheDocument()

    // Price appears in showcase and gallery (multiple occurrences is fine)
    expect(screen.getAllByText('€1,200')[0]).toBeInTheDocument()

    // OSM live venue panel is not present
    expect(screen.queryByRole('heading', { name: 'Nearby Live Venues' })).not.toBeInTheDocument()
  })

  it('opens the venue details modal when SEE THE DETAILS is clicked', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await openFirstVenueModal(user)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // All detailed assertions are scoped to the dialog to avoid conflicts
    // with identical text that appears in the background showcase section.
    const inDialog = within(dialog)
    expect(inDialog.getByRole('heading', { name: 'The Grand Hall', level: 2 })).toBeInTheDocument()
    expect(inDialog.getByText('About This Space')).toBeInTheDocument()
    expect(inDialog.getByText('250 m²')).toBeInTheDocument()
    expect(inDialog.getByText('Professional Projector & Screen')).toBeInTheDocument()
    expect(inDialog.getByRole('button', { name: 'Close venue details' })).toBeInTheDocument()
  })

  it('closes the venue details modal when the close button is clicked', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await openFirstVenueModal(user)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close venue details' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the venue details modal when Escape is pressed', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await openFirstVenueModal(user)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the venue details modal from the gallery section', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    // The gallery section renders "View Details" buttons for each venue
    const galleryButtons = await screen.findAllByRole('button', { name: 'View Details' })
    await user.click(galleryButtons[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('submits a quote request for an available room and date', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await openFirstVenueModal(user)

    await user.clear(screen.getByLabelText('Room Name'))
    await user.type(screen.getByLabelText('Room Name'), 'The Grand Hall')
    await user.type(screen.getByLabelText('Date'), '2026-06-15')
    await user.type(screen.getByLabelText('Your Email'), 'planner@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      screen.getByText(
        'Quote requested for The Grand Hall on 2026-06-15 by planner@example.com.',
      ),
    ).toBeInTheDocument()
  })

  it('blocks quote submission when the room is unavailable', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await openFirstVenueModal(user)

    await user.clear(screen.getByLabelText('Room Name'))
    await user.type(screen.getByLabelText('Room Name'), 'The Grand Hall')
    await user.type(screen.getByLabelText('Date'), '2026-05-15')
    await user.type(screen.getByLabelText('Your Email'), 'planner@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      screen.getByText(
        'The Grand Hall is not available on 2026-05-15. Quote request was not sent.',
      ),
    ).toBeInTheDocument()
  })

  it('registers a room details tool for the assistant', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('get_room_details', { roomName: 'river conference suite' }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        id: 'river-conference-suite',
        name: 'River Conference Suite',
        capacity: 120,
        location: 'Gera',
        pricePerDay: 1100,
        currencyCode: 'EUR',
        formattedPricePerDay: '€1,100',
        hasProjector: true,
        availableDates: ['2026-07-03', '2026-07-10', '2026-07-24'],
      },
    })
  })

  it('registers a broad venue listing tool for the assistant', async () => {
    renderVenuePage()

    await waitForVenueTools()

    const allVenues = (await callVenueTool('list_available_venues', {})) as { venues: unknown[] }

    expect(allVenues).toMatchObject({ success: true, date: '' })
    expect(allVenues.venues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'The Grand Hall',
          location: 'Erfurt',
          capacity: 150,
          formattedPricePerDay: '€1,200',
          nextAvailableDate: '2026-06-15',
        }),
      ]),
    )

    await expect(
      callVenueTool('list_available_venues', { date: '2026-06-15' }),
    ).resolves.toMatchObject({
      success: true,
      date: '2026-06-15',
      venues: [{ name: 'The Grand Hall', nextAvailableDate: '2026-06-15' }],
    })
  })

  it('handles null model arguments without crashing venue tools', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callAgentTool('list_available_venues', null as unknown as AgentToolParams),
    ).resolves.toMatchObject({
      success: true,
      date: '',
    })
  })

  it('registers an availability tool for the assistant', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('check_availability', { roomName: 'Grand Hall', date: '2026-06-15' }),
    ).resolves.toMatchObject({
      success: true,
      roomName: 'The Grand Hall',
      date: '2026-06-15',
      available: true,
    })
  })

  it('registers a pricing tool with explicit euro formatting', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(callVenueTool('get_pricing', { roomName: 'Grand Hall' })).resolves.toEqual({
      success: true,
      roomName: 'The Grand Hall',
      pricePerDay: 1200,
      currencyCode: 'EUR',
      formattedPricePerDay: '€1,200',
      priceDescription: '€1,200 per day',
    })
  })

  it('lets the assistant prepare the quote form for an available date', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await waitForVenueTools()

    // Open modal so the quote form fields are accessible in the DOM
    await openFirstVenueModal(user)

    await expect(
      callVenueTool('prepare_quote_request', {
        roomName: 'Grand Hall',
        date: '2026-06-15',
        email: 'planner@example.com',
      }),
    ).resolves.toMatchObject({ success: true, available: true })

    expect(screen.getByLabelText('Room Name')).toHaveValue('The Grand Hall')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-06-15')
    expect(screen.getByLabelText('Your Email')).toHaveValue('planner@example.com')
  })

  it('keeps the quote form untouched when the assistant requests an unavailable date', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await waitForVenueTools()

    // Open modal so quote status message and form are visible
    await openFirstVenueModal(user)

    await expect(
      callVenueTool('prepare_quote_request', {
        roomName: 'Grand Hall',
        date: '2026-05-15',
        email: 'planner@example.com',
      }),
    ).resolves.toMatchObject({
      success: false,
      available: false,
      message:
        'The Grand Hall is not available on 2026-05-15. Quote request form was not prepared.',
    })

    expect(screen.getByLabelText('Room Name')).toHaveValue('')
    expect(
      screen.getByText(
        'The Grand Hall is not available on 2026-05-15. Quote request form was not prepared.',
      ),
    ).toBeInTheDocument()
  })
})
