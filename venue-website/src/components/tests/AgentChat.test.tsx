import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAgentTool } from '../../lib/toolRegistry'
import AgentChat from '../AgentChat'

function createChatResponse(body: unknown): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function createChatErrorResponse(body: unknown): Response {
  return {
    ok: false,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('AgentChat', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('does not send a default prompt when the widget first loads', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()

    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentChat />)

    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      screen.queryByText("Hi! I'm planning an event and I'd like to explore your venue spaces."),
    ).not.toBeInTheDocument()
  })

  it('starts fresh even when previous chat history exists in localStorage', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()

    localStorage.setItem(
      'agentChatMessages',
      JSON.stringify([
        {
          id: 'legacy-auto-prompt',
          role: 'user',
          content: "Hi! I'm planning an event and I'd like to explore your venue spaces.",
        },
      ]),
    )

    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorage.getItem('agentChatMessages')).toBeNull()
    expect(
      screen.queryByText("Hi! I'm planning an event and I'd like to explore your venue spaces."),
    ).not.toBeInTheDocument()
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

    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'The Grand Hall is a flexible event space.',
              },
            },
          ],
        }),
      ),
    )

    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(
      screen.getByPlaceholderText('Ask about rooms, dates, or quotes'),
      'Show me the Grand Hall details.',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByText('Show me the Grand Hall details.')).toBeInTheDocument()
    expect(await screen.findByText('The Grand Hall is a flexible event space.')).toBeInTheDocument()
    expect(localStorage.getItem('agentChatMessages')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Minimize chat' }))
    await user.click(screen.getByRole('button', { name: 'Open chat' }))
    expect(screen.getByText('Show me the Grand Hall details.')).toBeInTheDocument()
    expect(screen.getByText('The Grand Hall is a flexible event space.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close chat and reset conversation' }))

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    expect(screen.queryByText('Show me the Grand Hall details.')).not.toBeInTheDocument()
    expect(
      screen.queryByText('The Grand Hall is a flexible event space.'),
    ).not.toBeInTheDocument()
  })

  it('shows a useful error when the chat API key is missing', async () => {
    const user = userEvent.setup()

    vi.stubEnv('VITE_GROQ_API_KEY', '')
    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(screen.getByPlaceholderText('Ask about rooms, dates, or quotes'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(
      await screen.findByText('Missing VITE_GROQ_API_KEY in your local environment.'),
    ).toBeInTheDocument()
  })

  it('runs a model-requested tool and renders the final assistant response', async () => {
    const user = userEvent.setup()
    const unregister = registerAgentTool(
      {
        name: 'check_availability',
        description: 'Checks room availability.',
        schema: { type: 'object', properties: {} },
      },
      () => ({
        success: true,
        roomName: 'The Grand Hall',
        date: '2026-06-15',
        available: true,
        message: 'The Grand Hall is available on 2026-06-15.',
      }),
    )

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
                      id: 'call-1',
                      function: {
                        name: 'check_availability',
                        arguments: '{"roomName":"The Grand Hall","date":"2026-06-15"}',
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
                  content: 'The Grand Hall is available on 2026-06-15.',
                },
              },
            ],
          }),
        ),
    )

    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(
      screen.getByPlaceholderText('Ask about rooms, dates, or quotes'),
      'Is The Grand Hall free on June 15?',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(
      await screen.findByText('The Grand Hall is available on 2026-06-15.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    unregister()
  })

  it('treats null model tool arguments as an empty object', async () => {
    const user = userEvent.setup()
    const unregister = registerAgentTool(
      {
        name: 'list_available_venues',
        description: 'Lists available venues.',
        schema: { type: 'object', properties: {} },
      },
      (params) => ({
        success: true,
        date: params.date ?? '',
      }),
    )

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
                      id: 'call-1',
                      function: {
                        name: 'list_available_venues',
                        arguments: 'null',
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
                  content: 'Here are the current venue options.',
                },
              },
            ],
          }),
        ),
    )

    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(
      screen.getByPlaceholderText('Ask about rooms, dates, or quotes'),
      'Which venues are available?',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('Here are the current venue options.')).toBeInTheDocument()

    unregister()
  })

  it('keeps leaked tool syntax out of the visible assistant response', async () => {
    const user = userEvent.setup()

    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          choices: [
            {
              message: {
                role: 'assistant',
                content:
                  'If you give me a room name, I can call <function=get_room_details>{"roomName":"The Grand Hall"}</function> to get the details.',
              },
            },
          ],
        }),
      ),
    )

    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(
      screen.getByPlaceholderText('Ask about rooms, dates, or quotes'),
      'Which venues are available?',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/Please share your event date/)).toBeInTheDocument()
    expect(screen.queryByText(/<function=/)).not.toBeInTheDocument()
    expect(screen.queryByText(/get_room_details/)).not.toBeInTheDocument()
  })

  it('shows a friendly fallback instead of raw provider failed_generation errors', async () => {
    const user = userEvent.setup()

    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatErrorResponse({
          error: {
            message:
              "Failed to call a function. Please adjust your prompt. See 'failed_generation' for more details.",
          },
        }),
      ),
    )

    render(<AgentChat />)

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(
      screen.getByPlaceholderText('Ask about rooms, dates, or quotes'),
      'Can you give me details of the venue which can accomodate around 100 to 150 people?',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/guest count, capacity range/)).toBeInTheDocument()
    expect(screen.queryByText(/failed_generation/i)).not.toBeInTheDocument()
  })
})
