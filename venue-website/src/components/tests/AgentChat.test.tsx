import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { registerAgentTool } from '../../lib/toolRegistry'
import AgentChat from '../AgentChat'

function createChatResponse(body: unknown): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('AgentChat', () => {
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
        roomName: 'Grand Hall',
        date: '2026-05-17',
        available: true,
        message: 'Grand Hall is available on 2026-05-17.',
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
                        arguments: '{"roomName":"Grand Hall","date":"2026-05-17"}',
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
                  content: 'Grand Hall is available on 2026-05-17.',
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
      'Is Grand Hall free on May 17?',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('Grand Hall is available on 2026-05-17.')).toBeInTheDocument()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    unregister()
  })
})
