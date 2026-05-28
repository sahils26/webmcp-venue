import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAgentTool } from '../useAgentTool'

type CapturedWebMCPTool = {
  name: string
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

function TestTool({ value }: { value: string }) {
  useAgentTool(
    {
      name: 'webmcp_test_tool',
      description: 'WebMCP registration test tool.',
      schema: { type: 'object', properties: {} },
    },
    () => value,
  )

  return null
}

function stubDocumentModelContext(registerTool: (tool: CapturedWebMCPTool) => unknown): void {
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: { registerTool },
  })
}

function stubNavigatorModelContext(registerTool: (tool: CapturedWebMCPTool) => unknown): void {
  Object.defineProperty(navigator, 'modelContext', {
    configurable: true,
    value: { registerTool },
  })
}

describe('useAgentTool', () => {
  afterEach(() => {
    globalThis.__venueWebMCPTools?.clear()
    Reflect.deleteProperty(globalThis, '__venueWebMCPTools')
    Reflect.deleteProperty(document, 'modelContext')
    Reflect.deleteProperty(navigator, 'modelContext')
  })

  it('registers a WebMCP tool once while keeping the callback fresh', async () => {
    let capturedTool: CapturedWebMCPTool | undefined
    const registerTool = vi.fn((tool: CapturedWebMCPTool) => {
      capturedTool = tool
    })

    stubNavigatorModelContext(registerTool)

    const { rerender, unmount } = render(<TestTool value="first" />)

    expect(registerTool).toHaveBeenCalledTimes(1)
    await expect(capturedTool?.execute({})).resolves.toBe('first')

    rerender(<TestTool value="second" />)

    expect(registerTool).toHaveBeenCalledTimes(1)
    await expect(capturedTool?.execute({})).resolves.toBe('second')

    unmount()

    await expect(capturedTool?.execute({})).resolves.toEqual({
      success: false,
      message: "Tool 'webmcp_test_tool' is not active.",
    })

    const { unmount: unmountAgain } = render(<TestTool value="third" />)

    expect(registerTool).toHaveBeenCalledTimes(1)
    await expect(capturedTool?.execute({})).resolves.toBe('third')

    unmountAgain()
  })

  it('ignores duplicate WebMCP tool name errors from an existing browser registration', () => {
    const registerTool = vi.fn(() => {
      throw new DOMException('Duplicate tool name', 'InvalidStateError')
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    stubNavigatorModelContext(registerTool)

    const { unmount } = render(<TestTool value="first" />)

    expect(registerTool).toHaveBeenCalledTimes(1)
    expect(warn).not.toHaveBeenCalled()

    unmount()
  })

  it('prefers document.modelContext over deprecated navigator.modelContext', () => {
    const documentRegisterTool = vi.fn()
    const navigatorRegisterTool = vi.fn()

    stubDocumentModelContext(documentRegisterTool)
    stubNavigatorModelContext(navigatorRegisterTool)

    const { unmount } = render(<TestTool value="first" />)

    expect(documentRegisterTool).toHaveBeenCalledTimes(1)
    expect(navigatorRegisterTool).not.toHaveBeenCalled()

    unmount()
  })
})
