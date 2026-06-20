import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callAgentTool, listAgentTools } from '../../lib/toolRegistry'
import { QUOTE_SUCCESS_RESET_DELAY_MS } from '../../features/quote/quoteTiming'
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
        'recommend_venues_by_event_type',
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

async function selectHomepageVenueAndDate(user: ReturnType<typeof userEvent.setup>) {
  const quoteSection = screen.getByRole('region', { name: 'Request a Quote' })

  await user.click(within(quoteSection).getByLabelText('Venue'))
  await user.click(within(quoteSection).getByRole('option', { name: /The Grand Hall/ }))
  await user.click(
    within(quoteSection).getByRole('button', {
      name: /June 15, 2026, available/,
    }),
  )

  return quoteSection
}

describe('VenuePage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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

  it('filters venue cards by event type and clears it with reset', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    await user.selectOptions(screen.getByLabelText('Event type'), 'wedding')

    let venueGrid = screen.getByRole('list', { name: 'All venues' })
    expect(screen.getByText('Showing 2 of 5 curated venues')).toBeInTheDocument()
    expect(within(venueGrid).getByRole('heading', { name: 'The Grand Hall' })).toBeInTheDocument()
    expect(within(venueGrid).getByRole('heading', { name: 'Garden Pavilion' })).toBeInTheDocument()
    expect(
      within(venueGrid).queryByRole('heading', { name: 'Skyline Loft' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))

    venueGrid = screen.getByRole('list', { name: 'All venues' })
    expect(screen.getByText('5 curated venues in Jena, Germany')).toBeInTheDocument()
    expect(within(venueGrid).getByRole('heading', { name: 'Skyline Loft' })).toBeInTheDocument()
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

  it('requires an email before continuing a homepage quote request', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const quoteSection = await selectHomepageVenueAndDate(user)
    await user.click(within(quoteSection).getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      within(quoteSection).getByText('Please enter a valid email address for the quote request.'),
    ).toBeInTheDocument()
    expect(within(quoteSection).getByRole('alert')).toHaveClass('quote-status--error')
    expect(window.location.pathname).toBe('/')
  })

  it('shows success, clears a valid homepage quote form, and keeps the date blocked', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const quoteSection = await selectHomepageVenueAndDate(user)
    await user.type(within(quoteSection).getByLabelText('Your Email'), 'planner@example.com')
    vi.useFakeTimers()
    fireEvent.click(within(quoteSection).getByRole('button', { name: 'Submit Quote Request' }))

    expect(window.location.pathname).toBe('/')
    expect(
      within(quoteSection).getByText(
        'Quote requested for The Grand Hall on 2026-06-15 by planner@example.com. The date is now held.',
      ),
    ).toBeInTheDocument()
    expect(within(quoteSection).getByRole('status')).toHaveClass('quote-status--success')
    expect(
      within(quoteSection).getByRole('button', { name: /June 15, 2026, booked/ }),
    ).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(QUOTE_SUCCESS_RESET_DELAY_MS)
    })
    vi.useRealTimers()

    expect(within(quoteSection).getByLabelText('Venue')).toHaveValue('')
    expect(within(quoteSection).getByLabelText('Date')).toHaveValue('')
    expect(within(quoteSection).getByLabelText('Your Email')).toHaveValue('')
    expect(
      within(quoteSection).queryByText(
        'Quote requested for The Grand Hall on 2026-06-15 by planner@example.com. The date is now held.',
      ),
    ).not.toBeInTheDocument()

    await user.click(within(quoteSection).getByLabelText('Venue'))
    await user.click(within(quoteSection).getByRole('option', { name: /The Grand Hall/ }))

    expect(
      within(quoteSection).getByRole('button', { name: /June 15, 2026, booked/ }),
    ).toBeDisabled()
  })

  it('shows a homepage quote hold as blocked when the user later visits the detail page', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const quoteSection = await selectHomepageVenueAndDate(user)
    await user.type(within(quoteSection).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quoteSection).getByRole('button', { name: 'Submit Quote Request' }))

    expect(window.location.pathname).toBe('/')

    const venueGrid = screen.getByRole('list', { name: 'All venues' })
    await user.click(
      within(venueGrid).getByRole('article', { name: 'The Grand Hall venue card' }),
    )

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })
    expect(
      within(quotePanel).getByRole('button', { name: /June 15, 2026, booked/ }),
    ).toBeDisabled()
  })

  it('keeps date selection locked until a venue is selected', async () => {
    const user = userEvent.setup()
    renderVenuePage()

    const quoteSection = screen.getByRole('region', { name: 'Request a Quote' })
    expect(within(quoteSection).getByLabelText('Date')).toBeDisabled()
    expect(
      within(quoteSection).getAllByText('Select a venue first to unlock the booking calendar.')
        .length,
    ).toBeGreaterThan(0)

    await user.type(within(quoteSection).getByLabelText('Your Email'), 'planner@example.com')
    await user.click(within(quoteSection).getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      within(quoteSection).getByText('Please select a venue from the list before choosing a date.'),
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
        availableDates: [],
        blockedDates: [],
        availabilityNote: 'All future dates are available unless already booked.',
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
          availabilityNote: 'All future dates are available unless already booked.',
        }),
      ]),
    )

    await expect(
      callVenueTool('list_available_venues', { date: '2030-06-15' }),
    ).resolves.toMatchObject({
      success: true,
      date: '2030-06-15',
      venues: expect.arrayContaining([
        expect.objectContaining({ name: 'The Grand Hall' }),
        expect.objectContaining({ name: 'Garden Pavilion' }),
      ]),
    })
  })

  it('registers an event-type recommendation tool for the assistant', async () => {
    renderVenuePage()

    await waitForVenueTools()

    const weddingVenues = (await callVenueTool('recommend_venues_by_event_type', {
      eventType: 'wedding',
    })) as { venues: { name: string }[] }

    expect(weddingVenues).toMatchObject({ success: true, matchedEventType: 'wedding' })
    expect(weddingVenues.venues.map((venue) => venue.name).sort()).toEqual([
      'Garden Pavilion',
      'The Grand Hall',
    ])

    await expect(
      callVenueTool('recommend_venues_by_event_type', { eventType: 'birthday' }),
    ).resolves.toMatchObject({
      success: true,
      matchedEventType: 'celebration',
      venues: expect.arrayContaining([
        expect.objectContaining({ name: 'Atelier Courtyard' }),
        expect.objectContaining({ name: 'Garden Pavilion' }),
      ]),
    })

    await expect(
      callVenueTool('recommend_venues_by_event_type', { eventType: 'underwater rave' }),
    ).resolves.toMatchObject({ success: false, matchedEventType: '' })
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
        query: 'birthday party for 60 people',
      }),
    ).resolves.toMatchObject({
      success: true,
      matchedEventType: 'celebration',
      exactMatchCount: 2,
      venues: expect.arrayContaining([
        expect.objectContaining({ name: 'Atelier Courtyard' }),
        expect.objectContaining({ name: 'Garden Pavilion' }),
      ]),
    })

    await expect(
      callVenueTool('search_venues', {
        guestCount: 100,
        requiredAmenities: ['projector'],
      }),
    ).resolves.toMatchObject({
      success: true,
      matchedEventType: '',
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
      matchedEventType: 'wedding',
      exactMatchCount: 1,
      suggestionCount: 0,
      venues: [
        expect.objectContaining({
          fit: 'exact',
          name: 'Garden Pavilion',
          matchedAmenities: expect.arrayContaining(['outdoor', 'catering', 'parking']),
        }),
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

    await expect(
      callVenueTool('check_availability', {
        roomName: 'Garden Pavilion',
        date: '2026-07-08',
        eventType: 'birthday',
      }),
    ).resolves.toMatchObject({
      success: true,
      roomName: 'Garden Pavilion',
      date: '2026-07-08',
      available: true,
      matchedEventType: 'celebration',
      eventTypeSuitable: true,
    })

    await expect(
      callVenueTool('check_availability', {
        roomName: 'Grand Hall',
        date: '2026-06-15',
        eventType: 'birthday',
      }),
    ).resolves.toMatchObject({
      success: true,
      roomName: 'The Grand Hall',
      date: '2026-06-15',
      available: false,
      matchedEventType: 'celebration',
      eventTypeSuitable: false,
    })
  })

  it('carries event type context into availability checks until a generic search clears it', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('recommend_venues_by_event_type', { eventType: 'birthday' }),
    ).resolves.toMatchObject({ success: true, matchedEventType: 'celebration' })

    await expect(
      callVenueTool('check_availability', {
        roomName: 'Garden Pavilion',
        date: '2026-07-08',
      }),
    ).resolves.toMatchObject({
      success: true,
      available: true,
      matchedEventType: 'celebration',
      eventTypeSuitable: true,
    })

    await expect(
      callVenueTool('search_venues', {
        guestCount: 100,
        requiredAmenities: ['projector'],
      }),
    ).resolves.toMatchObject({ success: true, matchedEventType: '' })

    const unconstrainedAvailability = (await callVenueTool('check_availability', {
      roomName: 'Grand Hall',
      date: '2026-06-15',
    })) as Record<string, unknown>

    expect(unconstrainedAvailability).toMatchObject({
      success: true,
      available: true,
    })
    expect(unconstrainedAvailability).not.toHaveProperty('matchedEventType')
    expect(unconstrainedAvailability).not.toHaveProperty('eventTypeSuitable')
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

    expect(screen.getByLabelText('Venue')).toHaveValue('The Grand Hall')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-06-15')
    expect(screen.getByLabelText('Your Email')).toHaveValue('planner@example.com')
  })

  it('minimizes the chat and scrolls to the filled homepage quote form', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          response: 'I prepared the quote form. Please review it and submit when ready.',
          tool_calls: [
            {
              name: 'prepare_quote_request',
              arguments: {
                roomName: 'Grand Hall',
                date: '2026-06-15',
                email: 'planner@example.com',
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
      expect(within(quoteSection).getByLabelText('Venue')).toHaveValue('The Grand Hall')
    })
    expect(within(quoteSection).getByLabelText('Date')).toHaveValue('2026-06-15')
    expect(within(quoteSection).getByLabelText('Your Email')).toHaveValue('planner@example.com')
    expect(screen.getByLabelText('spaces360 Assistant minimized')).toBeInTheDocument()
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
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
      message: 'Please choose today or a future date. Quote request form was not prepared.',
    })

    expect(screen.getByLabelText('Venue')).toHaveValue('')
    expect(
      screen.getByText('Please choose today or a future date. Quote request form was not prepared.'),
    ).toBeInTheDocument()
  })

  it('keeps the quote form untouched when the room does not suit the event type', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('prepare_quote_request', {
        roomName: 'Grand Hall',
        date: '2026-06-15',
        email: 'planner@example.com',
        eventType: 'birthday',
      }),
    ).resolves.toMatchObject({
      success: false,
      available: false,
      matchedEventType: 'celebration',
      eventTypeSuitable: false,
      message:
        'The Grand Hall is available on 2026-06-15, but it is not tagged for Celebration & Party. Quote request form was not prepared.',
    })

    expect(screen.getByLabelText('Venue')).toHaveValue('')
    expect(
      screen.getByText(
        'The Grand Hall is available on 2026-06-15, but it is not tagged for Celebration & Party. Quote request form was not prepared.',
      ),
    ).toBeInTheDocument()
  })
})
