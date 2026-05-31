import { describe, expect, it } from 'vitest'
import {
  callAgentTool,
  formatToolResultForModel,
  getClaudeToolDefinitions,
  getOpenAIToolDefinitions,
  listAgentTools,
  registerAgentTool,
} from '../toolRegistry'

describe('agent tool registry', () => {
  it('registers, lists, calls, and unregisters tools', async () => {
    const unregister = registerAgentTool(
      {
        name: 'echo_tool',
        description: 'Echoes the provided value.',
        schema: {
          type: 'object',
          properties: { value: { type: 'string' } },
          required: ['value'],
        },
      },
      (params) => ({ echoed: params.value }),
    )

    expect(listAgentTools()).toEqual([
      expect.objectContaining({
        name: 'echo_tool',
        description: 'Echoes the provided value.',
      }),
    ])
    await expect(callAgentTool('echo_tool', { value: 'hello' })).resolves.toEqual({
      echoed: 'hello',
    })

    unregister()

    await expect(callAgentTool('echo_tool')).rejects.toThrow(
      "Tool 'echo_tool' is not registered.",
    )
  })

  it('formats tools for OpenAI-compatible providers', () => {
    const unregister = registerAgentTool(
      { name: 'provider_tool', description: 'Provider test tool.' },
      () => 'ok',
    )

    expect(getOpenAIToolDefinitions()).toContainEqual({
      type: 'function',
      function: {
        name: 'provider_tool',
        description: 'Provider test tool.',
        parameters: { type: 'object', properties: {} },
      },
    })

    unregister()
  })

  it('formats tools for Claude-compatible providers', () => {
    const unregister = registerAgentTool(
      { name: 'claude_tool', description: 'Claude test tool.' },
      () => 'ok',
    )

    expect(getClaudeToolDefinitions()).toContainEqual({
      name: 'claude_tool',
      description: 'Claude test tool.',
      input_schema: { type: 'object', properties: {} },
    })

    unregister()
  })

  it('formats different tool result shapes for model context', () => {
    expect(formatToolResultForModel('plain text')).toBe('plain text')
    expect(formatToolResultForModel({ available: true })).toBe('{"available":true}')
    expect(
      formatToolResultForModel({
        content: [{ text: 'first' }, { text: 'second' }],
      }),
    ).toBe('first\nsecond')
  })
})
