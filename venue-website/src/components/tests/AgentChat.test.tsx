import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAgentTool } from '../../lib/toolRegistry'
import AgentChat from '../AgentChat'

const STARTER_MESSAGE =
  'Hi! I can help you compare venue spaces, check room availability for a date, find rooms by guest count or facilities, and prepare a quote request.'

function createChatResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

async function sendMessage(message: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
  await user.type(screen.getByPlaceholderText('Ask about rooms, dates, or quotes'), message)
  await user.click(screen.getByRole('button', { name: 'Send' }))
}

describe('AgentChat', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows a starter assistant message without sending a default prompt', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentChat />)

    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(STARTER_MESSAGE)).toBeInTheDocument()
  })

  it('sends conversation and page context to the Python backend', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      createChatResponse({
        response: 'I can help narrow that down by guest count and facilities.',
        tool_calls: [],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentChat pageContext="Current page context: venue list." />)
    await sendMessage('Which rooms fit around 120 people?')

    expect(
      await screen.findByText('I can help narrow that down by guest count and facilities.'),
    ).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/agent-api/chat')

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const requestBody = JSON.parse(String(requestInit?.body)) as {
      messages: Array<{ role: string; content: string }>
    }

    expect(requestBody.messages).toEqual([
      expect.objectContaining({ role: 'system' }),
      { role: 'system', content: 'Current page context: venue list.' },
      { role: 'user', content: 'Which rooms fit around 120 people?' },
    ])
    expect((requestInit?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('starts fresh even when previous chat history exists in localStorage', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    localStorage.setItem('agentChatMessages', JSON.stringify([{ role: 'user', content: 'Old' }]))
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentChat />)
    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorage.getItem('agentChatMessages')).toBeNull()
    expect(screen.queryByText('Old')).not.toBeInTheDocument()
  })

  it('opens, minimizes, and closes the assistant widget', async () => {
    const user = userEvent.setup()
    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    expect(screen.getByRole('heading', { name: 'spaces360 Assistant' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Minimize chat' }))
    expect(screen.getByLabelText('spaces360 Assistant minimized')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close chat and reset conversation' }))
    expect(screen.getByRole('button', { name: /spaces360 Assistant/i })).toBeInTheDocument()
  })

  it('preserves chat history when minimized and clears it when closed', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          response: 'The Grand Hall is a flexible event space.',
          tool_calls: [],
        }),
      ),
    )

    render(<AgentChat />)
    await sendMessage('Show me the Grand Hall details.')

    expect(await screen.findByText('The Grand Hall is a flexible event space.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Minimize chat' }))
    await user.click(screen.getByRole('button', { name: 'Open chat' }))
    expect(screen.getByText('Show me the Grand Hall details.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close chat and reset conversation' }))
    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    expect(screen.queryByText('Show me the Grand Hall details.')).not.toBeInTheDocument()
  })

  it('shows a useful backend configuration error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse(
          { detail: 'MISTRAL_API_KEY is missing. Add it to agent/.env.' },
          false,
        ),
      ),
    )

    render(<AgentChat />)
    await sendMessage('Hello')

    expect(
      await screen.findByText('MISTRAL_API_KEY is missing. Add it to agent/.env.'),
    ).toBeInTheDocument()
  })

  it('mirrors backend WebMCP actions in the visible frontend', async () => {
    const toolHandler = vi.fn().mockResolvedValue({ success: true })
    const unregister = registerAgentTool(
      {
        name: 'check_availability',
        description: 'Checks room availability.',
        schema: { type: 'object', properties: {} },
      },
      toolHandler,
    )
    const fetchMock = vi.fn().mockResolvedValueOnce(
      createChatResponse({
        response: 'The Grand Hall is available on 2026-06-22.',
        tool_calls: [
          {
            name: 'check_availability',
            arguments: { roomName: 'The Grand Hall', date: '2026-06-22' },
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentChat />)
    await sendMessage('Is The Grand Hall free on June 15?')

    expect(
      await screen.findByText('The Grand Hall is available on 2026-06-22.'),
    ).toBeInTheDocument()
    expect(toolHandler).toHaveBeenCalledWith({
      roomName: 'The Grand Hall',
      date: '2026-06-22',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    unregister()
  })

  it('treats missing backend tool arguments as an empty object', async () => {
    const toolHandler = vi.fn().mockResolvedValue({ success: true })
    const unregister = registerAgentTool(
      {
        name: 'list_available_venues',
        description: 'Lists available venues.',
        schema: { type: 'object', properties: {} },
      },
      toolHandler,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          response: 'Here are the current venue options.',
          tool_calls: [{ name: 'list_available_venues' }],
        }),
      ),
    )

    render(<AgentChat />)
    await sendMessage('Which venues are available?')

    expect(await screen.findByText('Here are the current venue options.')).toBeInTheDocument()
    expect(toolHandler).toHaveBeenCalledWith({})
    unregister()
  })

  it('keeps leaked tool syntax out of the visible assistant response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          response:
            'I can call <function=get_room_details>{"roomName":"The Grand Hall"}</function>.',
          tool_calls: [],
        }),
      ),
    )

    render(<AgentChat />)
    await sendMessage('Which venues are available?')

    expect(await screen.findByText(/Please share your event date/)).toBeInTheDocument()
    expect(screen.queryByText(/<function=/)).not.toBeInTheDocument()
  })

  it('shows a friendly fallback instead of raw provider errors from the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse(
          { detail: 'Failed to call a function. See failed_generation for details.' },
          false,
        ),
      ),
    )

    render(<AgentChat />)
    await sendMessage('Find a venue for 100 to 150 people')

    expect(await screen.findByText(/guest count, capacity range/)).toBeInTheDocument()
    expect(screen.queryByText(/failed_generation/i)).not.toBeInTheDocument()
  })

  it('waits for a mirrored tool before rendering the final response', async () => {
    let resolveTool: (() => void) | undefined
    const unregister = registerAgentTool(
      {
        name: 'slow_tool',
        description: 'Slow action.',
        schema: { type: 'object', properties: {} },
      },
      () =>
        new Promise<void>((resolve) => {
          resolveTool = resolve
        }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          response: 'Finished.',
          tool_calls: [{ name: 'slow_tool', arguments: {} }],
        }),
      ),
    )

    render(<AgentChat />)
    await sendMessage('Run it')

    expect(screen.queryByText('Finished.')).not.toBeInTheDocument()
    resolveTool?.()
    await waitFor(() => expect(screen.getByText('Finished.')).toBeInTheDocument())
    unregister()
  })
})
