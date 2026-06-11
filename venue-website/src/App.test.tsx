import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { callAgentTool, listAgentTools } from './lib/toolRegistry'
import { renderWithProviders } from './tests/renderWithProviders'
import type { AgentToolParams } from './types/agentTool'
import App from './App'

function createChatResponse(body: unknown): Response {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function renderAppAt(path: string) {
  window.history.pushState({}, '', path)
  return renderWithProviders(<App />)
}

async function waitForVenueTools(): Promise<void> {
  await waitFor(() => {
    expect(listAgentTools().map((tool) => tool.name)).toEqual(
      expect.arrayContaining(['prepare_quote_request', 'check_availability']),
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

describe('App', () => {
  it('keeps the chat widget available on venue detail pages', () => {
    renderAppAt('/venues/grand-hall')

    expect(
      screen.getByRole('button', { name: /spaces360 Assistant/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Grand Hall', level: 1 })).toBeInTheDocument()
  })

  it('lets the assistant fill the detail-page quote form for the current venue', async () => {
    renderAppAt('/venues/grand-hall')

    await waitForVenueTools()

    await expect(
      callVenueTool('check_availability', { date: '2026-06-15' }),
    ).resolves.toMatchObject({
      success: true,
      roomName: 'The Grand Hall',
      date: '2026-06-15',
      available: true,
    })

    await expect(
      callVenueTool('prepare_quote_request', {
        date: '2026-06-15',
        email: 'planner@example.com',
      }),
    ).resolves.toMatchObject({ success: true, available: true })

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })

    await waitFor(() => {
      expect(within(quotePanel).getByLabelText('Venue')).toHaveValue('The Grand Hall')
    })
    expect(within(quotePanel).getByLabelText('Date')).toHaveValue('2026-06-15')
    expect(within(quotePanel).getByLabelText('Your Email')).toHaveValue('planner@example.com')
    expect(screen.getByLabelText('spaces360 Assistant minimized')).toBeInTheDocument()
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('fills the detail-page quote form through the chat tool flow', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        createChatResponse({
          response: 'I prepared the detail-page quote form for your review.',
          tool_calls: [
            {
              name: 'check_availability',
              arguments: { date: '2026-06-15' },
            },
            {
              name: 'prepare_quote_request',
              arguments: { date: '2026-06-15', email: 'planner@example.com' },
            },
          ],
        }),
      ),
    )

    renderAppAt('/venues/grand-hall')
    await waitForVenueTools()

    await user.click(screen.getByRole('button', { name: /spaces360 Assistant/i }))
    await user.type(
      screen.getByPlaceholderText('Ask about rooms, dates, or quotes'),
      'Check if this venue is available on June 15, 2026 and fill the quote form with planner@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    const quotePanel = screen.getByRole('complementary', { name: 'Quote request' })

    await waitFor(() => {
      expect(within(quotePanel).getByLabelText('Date')).toHaveValue('2026-06-15')
    })
    expect(within(quotePanel).getByLabelText('Venue')).toHaveValue('The Grand Hall')
    expect(within(quotePanel).getByLabelText('Your Email')).toHaveValue('planner@example.com')
    expect(screen.getByLabelText('spaces360 Assistant minimized')).toBeInTheDocument()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })
})
