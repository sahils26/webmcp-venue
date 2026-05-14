import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../services/api/httpClient'
import { renderWithProviders } from '../../tests/renderWithProviders'
import { callAgentTool, listAgentTools } from '../../lib/toolRegistry'
import type { AgentToolParams } from '../../types/agentTool'
import VenuePage from '../VenuePage'

vi.mock('../../services/api/httpClient', () => ({
  httpClient: {
    request: vi.fn(),
  },
}))

const mockedHttpRequest = vi.mocked(httpClient.request)

function createAxiosResponse(data: unknown): Awaited<ReturnType<typeof httpClient.request>> {
  return { data } as Awaited<ReturnType<typeof httpClient.request>>
}

function renderVenuePage() {
  return renderWithProviders(<VenuePage />)
}

async function waitForVenueTools(): Promise<void> {
  await waitFor(() => {
    expect(listAgentTools().map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'get_room_details',
        'prepare_quote_request',
        'check_availability',
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
  beforeEach(() => {
    mockedHttpRequest.mockReset()
    mockedHttpRequest.mockResolvedValue(
      createAxiosResponse({
        elements: [
          {
            id: 1,
            lat: 50.9271,
            lon: 11.5892,
            tags: { name: 'Jena Convention Hotel', tourism: 'hotel' },
          },
        ],
      }),
    )
  })

  it('renders local room inventory and live venue candidates', async () => {
    renderVenuePage()

    expect(screen.getByRole('heading', { name: 'Venue XYZ' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Available Rooms' })).toBeInTheDocument()
    expect(screen.getByText('Grand Hall')).toBeInTheDocument()
    expect(screen.getByText('500 guests')).toBeInTheDocument()

    expect(await screen.findByText('Jena Convention Hotel')).toBeInTheDocument()
    expect(screen.getByText('hotel')).toBeInTheDocument()
  })

  it('submits a quote request for an available room and date', async () => {
    const user = userEvent.setup()

    renderVenuePage()

    await user.type(screen.getByLabelText('Room Name'), 'Grand Hall')
    await user.type(screen.getByLabelText('Date'), '2026-05-17')
    await user.type(screen.getByLabelText('Your Email'), 'planner@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      screen.getByText('Quote requested for Grand Hall on 2026-05-17 by planner@example.com.'),
    ).toBeInTheDocument()
  })

  it('blocks quote submission when the room is booked', async () => {
    const user = userEvent.setup()

    renderVenuePage()

    await user.type(screen.getByLabelText('Room Name'), 'Grand Hall')
    await user.type(screen.getByLabelText('Date'), '2026-05-15')
    await user.type(screen.getByLabelText('Your Email'), 'planner@example.com')
    await user.click(screen.getByRole('button', { name: 'Submit Quote Request' }))

    expect(
      screen.getByText('Grand Hall is booked on 2026-05-15. Quote request was not sent.'),
    ).toBeInTheDocument()
  })

  it('shows a non-blocking error when live venues cannot load', async () => {
    mockedHttpRequest.mockRejectedValue(new Error('Network unavailable'))

    renderVenuePage()

    await waitFor(() => {
      expect(
        screen.getByText('Live venue source is unavailable right now.'),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: 'Available Rooms' })).toBeInTheDocument()
  })

  it('registers a room details tool for the assistant', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(callVenueTool('get_room_details', { roomName: 'lounge' })).resolves.toEqual({
      success: true,
      data: {
        capacity: 50,
        pricePerDay: 800,
        hasProjector: false,
      },
    })

    expect(getActiveAgentStatus()).toHaveTextContent(
      'The AI agent just requested details for Lounge.',
    )
  })

  it('registers an availability tool for the assistant', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('check_availability', {
        roomName: 'Grand Hall',
        date: '2026-05-17',
      }),
    ).resolves.toMatchObject({
      success: true,
      roomName: 'Grand Hall',
      date: '2026-05-17',
      available: true,
    })

    expect(getActiveAgentStatus()).toHaveTextContent(
      'Checking availability for Grand Hall on 2026-05-17',
    )
  })

  it('lets the assistant prepare the quote form for an available date', async () => {
    renderVenuePage()

    await waitForVenueTools()

    await expect(
      callVenueTool('prepare_quote_request', {
        roomName: 'Grand Hall',
        date: '2026-05-17',
        email: 'planner@example.com',
      }),
    ).resolves.toMatchObject({
      success: true,
      available: true,
    })

    expect(screen.getByLabelText('Room Name')).toHaveValue('Grand Hall')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-05-17')
    expect(screen.getByLabelText('Your Email')).toHaveValue('planner@example.com')
  })

  it('keeps the quote form untouched when the assistant requests a booked date', async () => {
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
      message: 'Grand Hall is booked on 2026-05-15. Quote request form was not prepared.',
    })

    expect(screen.getByLabelText('Room Name')).toHaveValue('')
    expect(
      screen.getByText('Grand Hall is booked on 2026-05-15. Quote request form was not prepared.'),
    ).toBeInTheDocument()
  })
})
