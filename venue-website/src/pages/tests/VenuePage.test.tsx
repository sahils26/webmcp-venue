import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { callAgentTool, listAgentTools } from '../../lib/toolRegistry'
import { renderWithProviders } from '../../tests/renderWithProviders'
import type { AgentToolParams } from '../../types/agentTool'
import App from '../../App'

function createChatResponse(body: unknown): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function renderVenuePage() {
  return renderAppAt()
}

function renderAppAt(path = '/') {
  window.history.pushState({}, '', path)
  return renderWithProviders(<App />)
}

async function waitForVenueTools(): Promise<void> {
  await waitFor(() => {
    expect(listAgentTools().map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'list_available_venues',
        'search_venues',
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

describe('VenuePage', () => {
  it('renders the venue card grid without the sequential showcase', () => {
    renderVenuePage()

    expect(
      screen.getByRole('heading', { name: /TURN YOUR EVENT INTO A/i }),
    ).toBeInTheDocument()

    const venueGrid = screen.getByRole('list', { name: 'All venues' })
    expect(within(venueGrid).getByRole('heading', { name: 'The Grand Hall' })).toBeInTheDocument()
    expect(within(venueGrid).getByRole('heading', { name: 'Skyline Loft' })).toBeInTheDocument()
    expect(
      within(venueGrid).getByRole('heading', { name: 'Atelier Courtyard' }),
    ).toBeInTheDocument()

    expect(within(venueGrid).getByText('Up to 150 guests')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'SEE THE DETAILS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(within(venueGrid).getByText('€1,200 / day')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nearby Live Venues' })).not.toBeInTheDocument()
  })

  it('links venue cards to dedicated detail pages', () => {
    renderVenuePage()

    const venueGrid = screen.getByRole('list', { name: 'All venues' })
    expect(
      within(venueGrid).getByRole('link', { name: 'View details for The Grand Hall' }),
    ).toHaveAttribute('href', '/venues/grand-hall')
  })

  it('filters venue cards by guest count, venue name, and amenities', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const guestCountInput = screen.getByLabelText('Number of people')
    await user.type(guestCountInput, '100')

    let venueGrid = screen.getByRole('list', { name: 'All venues' })
    expect(screen.getByText('Showing 2 of 5 curated venues')).toBeInTheDocument()
    expect(within(venueGrid).getByRole('heading', { name: 'The Grand Hall' })).toBeInTheDocument()
    expect(
      within(venueGrid).getByRole('heading', { name: 'River Conference Suite' }),
    ).toBeInTheDocument()
    expect(within(venueGrid).queryByRole('heading', { name: 'Skyline Loft' })).not.toBeInTheDocument()

    await user.clear(guestCountInput)
    await user.selectOptions(screen.getByLabelText('Venue name'), 'garden-pavilion')
    await user.click(screen.getByRole('checkbox', { name: 'Outdoor' }))

    venueGrid = screen.getByRole('list', { name: 'All venues' })
    expect(within(venueGrid).getByRole('heading', { name: 'Garden Pavilion' })).toBeInTheDocument()
    expect(within(venueGrid).queryByRole('heading', { name: 'The Grand Hall' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Projector' }))

    expect(screen.getByRole('status')).toHaveTextContent('No venues match these filters')
    expect(screen.queryByRole('list', { name: 'All venues' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))

    venueGrid = screen.getByRole('list', { name: 'All venues' })
    expect(screen.getByText('5 curated venues in Jena, Germany')).toBeInTheDocument()
    expect(within(venueGrid).getByRole('heading', { name: 'The Grand Hall' })).toBeInTheDocument()
    expect(within(venueGrid).getByRole('heading', { name: 'Garden Pavilion' })).toBeInTheDocument()
  })

  it('cycles venue card carousel images without leaving the venue list', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const venueGrid = screen.getByRole('list', { name: 'All venues' })
    const card = within(venueGrid).getByRole('article', { name: 'The Grand Hall venue card' })

    expect(within(card).getByRole('img')).toHaveAttribute(
      'alt',
      'The Grand Hall, image 1 of 3',
    )
    expect(within(card).getByText('1 / 3')).toBeInTheDocument()

    await user.click(
      within(card).getByRole('button', { name: 'Show next image for The Grand Hall' }),
    )

    expect(within(card).getByRole('img')).toHaveAttribute(
      'alt',
      'The Grand Hall, image 2 of 3',
    )
    expect(within(card).getByText('2 / 3')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')

    await user.click(
      within(card).getByRole('button', { name: 'Show previous image for The Grand Hall' }),
    )

    expect(within(card).getByRole('img')).toHaveAttribute(
      'alt',
      'The Grand Hall, image 1 of 3',
    )
    expect(within(card).getByText('1 / 3')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('opens the venue detail page when the card itself is clicked', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const venueGrid = screen.getByRole('list', { name: 'All venues' })
    await user.click(
      within(venueGrid).getByRole('article', { name: 'The Grand Hall venue card' }),
    )

    expect(window.location.pathname).toBe('/venues/grand-hall')
    expect(screen.getByRole('heading', { name: 'The Grand Hall', level: 1 })).toBeInTheDocument()
  })

  it('submits a quote request for an available room and date', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const quoteSection = screen.getByRole('region', { name: 'Request a Quote' })
    await user.clear(within(quoteSection).getByLabelText('Room Name'))
    await user.type(within(quoteSection).getByLabelText('Room Name'), 'The Grand Hall')
    await user.type(within(quoteSection).getByLabelText('Date'), '2026-06-15')
    await user.type(within(quoteSection).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quoteSection).getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      within(quoteSection).getByText(
        'Quote requested for The Grand Hall on 2026-06-15 by planner@example.com.',
      ),
    ).toBeInTheDocument()
  })

  it('blocks quote submission when the room is unavailable', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const quoteSection = screen.getByRole('region', { name: 'Request a Quote' })
    await user.clear(within(quoteSection).getByLabelText('Room Name'))
    await user.type(within(quoteSection).getByLabelText('Room Name'), 'The Grand Hall')
    await user.type(within(quoteSection).getByLabelText('Date'), '2026-05-15')
    await user.type(within(quoteSection).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quoteSection).getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      within(quoteSection).getByText(
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
        location: 'Jena',
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
          location: 'Jena',
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

  it('registers a flexible venue search tool for capacity and event-fit prompts', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('search_venues', {
        query:
          'Can you give me details of the venue which can accomodate around 100 to 150 people?',
      }),
    ).resolves.toMatchObject({
      success: true,
      exactMatchCount: 2,
      venues: expect.arrayContaining([
        expect.objectContaining({ name: 'The Grand Hall', capacity: 150 }),
        expect.objectContaining({ name: 'River Conference Suite', capacity: 120 }),
      ]),
    })

    await expect(
      callVenueTool('search_venues', {
        eventType: 'wedding',
        details: 'outdoor reception with catering and parking',
      }),
    ).resolves.toMatchObject({
      success: true,
      exactMatchCount: 0,
      suggestionCount: 3,
      venues: [
        expect.objectContaining({
          fit: 'suggestion',
          matchedAmenities: expect.arrayContaining(['outdoor', 'catering', 'parking']),
        }),
        expect.any(Object),
        expect.any(Object),
      ],
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
    renderVenuePage()

    await waitForVenueTools()

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

  it('minimizes the chat and scrolls to the filled homepage quote form', async () => {
    const user = userEvent.setup()

    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          createChatResponse({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'quote-call-1',
                      function: {
                        name: 'prepare_quote_request',
                        arguments:
                          '{"roomName":"Grand Hall","date":"2026-06-15","email":"planner@example.com"}',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          createChatResponse({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'I prepared the quote form. Please review it and submit when ready.',
                },
              },
            ],
          }),
        ),
    )

    renderAppAt()
    await waitForVenueTools()

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(
      screen.getByPlaceholderText('Ask about rooms, dates, or quotes'),
      'Fill the quote form for the Grand Hall on June 15, 2026 using planner@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    const quoteSection = screen.getByRole('region', { name: 'Request a Quote' })

    await waitFor(() => {
      expect(within(quoteSection).getByLabelText('Room Name')).toHaveValue('The Grand Hall')
    })
    expect(within(quoteSection).getByLabelText('Date')).toHaveValue('2026-06-15')
    expect(within(quoteSection).getByLabelText('Your Email')).toHaveValue('planner@example.com')
    expect(screen.getByLabelText('spaces360 Assistant minimized')).toBeInTheDocument()
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  it('keeps the quote form untouched when the assistant requests an unavailable date', async () => {
    renderVenuePage()

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
