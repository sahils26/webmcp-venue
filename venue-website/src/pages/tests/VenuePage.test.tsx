import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../tests/renderWithProviders'
import { callAgentTool, listAgentTools } from '../../lib/toolRegistry'
import type { AgentToolParams } from '../../types/agentTool'
import VenuePage from '../VenuePage'

function renderVenuePage() {
  return renderWithProviders(<VenuePage />)
}

async function renderActiveVenuePage() {
  const user = userEvent.setup()

  renderVenuePage()

  await user.type(screen.getByLabelText('Describe your event'), 'I need a venue')
  await user.click(screen.getByRole('button', { name: 'Start planning' }))
  await screen.findByRole('heading', { name: 'spaces360 venues' })

  return user
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

function getActiveAgentStatus(): HTMLElement {
  const status = document.querySelector<HTMLElement>('.agent-status--active')

  expect(status).not.toBeNull()

  return status as HTMLElement
}

describe('VenuePage', () => {
  it('renders venue search result cards without the parked OSM venue panel', async () => {
    await renderActiveVenuePage()

    expect(screen.getByRole('heading', { name: 'spaces360 venues' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Available Spaces' })).toBeInTheDocument()
    expect(screen.getByText('The Grand Hall')).toBeInTheDocument()
    expect(screen.getByText('150 guests')).toBeInTheDocument()
    expect(screen.getByText('€1,200')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nearby Live Venues' })).not.toBeInTheDocument()
  })

  it('expands a venue card into the detailed spaces360 layout', async () => {
    const user = await renderActiveVenuePage()

    await user.click(screen.getAllByRole('button', { name: 'View Details' })[0])

    expect(screen.getByRole('heading', { name: 'About the Venue' })).toBeInTheDocument()
    expect(screen.getByText('250 m²')).toBeInTheDocument()
    expect(screen.getByText('Professional Projector & Screen')).toBeInTheDocument()
    expect(screen.getByText(/Monday, June 15, 2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Details' })).toBeInTheDocument()
  })

  it('submits a quote request for an available room and date', async () => {
    const user = await renderActiveVenuePage()

    await user.type(screen.getByLabelText('Room Name'), 'The Grand Hall')
    await user.type(screen.getByLabelText('Date'), '2026-06-15')
    await user.type(screen.getByLabelText('Your Email'), 'planner@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      screen.getByText('Quote requested for The Grand Hall on 2026-06-15 by planner@example.com.'),
    ).toBeInTheDocument()
  })

  it('blocks quote submission when the room is unavailable', async () => {
    const user = await renderActiveVenuePage()

    await user.type(screen.getByLabelText('Room Name'), 'The Grand Hall')
    await user.type(screen.getByLabelText('Date'), '2026-05-15')
    await user.type(screen.getByLabelText('Your Email'), 'planner@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      screen.getByText('The Grand Hall is not available on 2026-05-15. Quote request was not sent.'),
    ).toBeInTheDocument()
  })

  it('registers a room details tool for the assistant', async () => {
    await renderActiveVenuePage()

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

    expect(getActiveAgentStatus()).toHaveTextContent(
      'Latest assistant action: River Conference Suite.',
    )
  })

  it('registers a broad venue listing tool for the assistant', async () => {
    await renderActiveVenuePage()

    await waitForVenueTools()

    const allVenues = (await callVenueTool('list_available_venues', {})) as { venues: unknown[] }

    expect(allVenues).toMatchObject({
      success: true,
      date: '',
    })
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
      venues: [
        {
          name: 'The Grand Hall',
          nextAvailableDate: '2026-06-15',
        },
      ],
    })

    expect(getActiveAgentStatus()).toHaveTextContent('Listing available venues on 2026-06-15')
  })

  it('registers an availability tool for the assistant', async () => {
    await renderActiveVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('check_availability', {
        roomName: 'Grand Hall',
        date: '2026-06-15',
      }),
    ).resolves.toMatchObject({
      success: true,
      roomName: 'The Grand Hall',
      date: '2026-06-15',
      available: true,
    })

    expect(getActiveAgentStatus()).toHaveTextContent(
      'Latest assistant action: Checking availability for The Grand Hall on 2026-06-15.',
    )
  })

  it('registers a pricing tool with explicit euro formatting', async () => {
    await renderActiveVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('get_pricing', {
        roomName: 'Grand Hall',
      }),
    ).resolves.toEqual({
      success: true,
      roomName: 'The Grand Hall',
      pricePerDay: 1200,
      currencyCode: 'EUR',
      formattedPricePerDay: '€1,200',
      priceDescription: '€1,200 per day',
    })
  })

  it('lets the assistant prepare the quote form for an available date', async () => {
    await renderActiveVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('prepare_quote_request', {
        roomName: 'Grand Hall',
        date: '2026-06-15',
        email: 'planner@example.com',
      }),
    ).resolves.toMatchObject({
      success: true,
      available: true,
    })

    expect(screen.getByLabelText('Room Name')).toHaveValue('The Grand Hall')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-06-15')
    expect(screen.getByLabelText('Your Email')).toHaveValue('planner@example.com')
  })

  it('keeps the quote form untouched when the assistant requests an unavailable date', async () => {
    await renderActiveVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('prepare_quote_request', {
        roomName: 'Grand Hall',
        date: '2026-05-15',
        email: 'planner@example.com',
      }),
    ).resolves.toMatchObject({
      success: false,
      available: false,
      message: 'The Grand Hall is not available on 2026-05-15. Quote request form was not prepared.',
    })

    expect(screen.getByLabelText('Room Name')).toHaveValue('')
    expect(
      screen.getByText(
        'The Grand Hall is not available on 2026-05-15. Quote request form was not prepared.',
      ),
    ).toBeInTheDocument()
  })
})
