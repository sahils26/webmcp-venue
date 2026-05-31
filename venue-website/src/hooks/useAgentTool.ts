import { useEffect, useRef } from 'react'
import { registerAgentTool } from '../lib/toolRegistry'
import type {
  AgentToolHandler,
  AgentToolParams,
  AgentToolRegistration,
  JsonSchema,
} from '../types/agentTool'

type WebMCPToolDefinition = {
  name: string
  description: string
  inputSchema?: JsonSchema
  execute: (params: AgentToolParams) => Promise<unknown>
}

type WebMCPModelContext = {
  registerTool?: (tool: WebMCPToolDefinition) => unknown
}

type WebMCPRegistryEntry = {
  execute: (params: AgentToolParams) => Promise<unknown>
  registered: boolean
  activeConsumers: number
}

declare global {
  var __venueWebMCPTools: Map<string, WebMCPRegistryEntry> | undefined
}

const inactiveToolResult = (name: string) => async () => ({
  success: false,
  message: `Tool '${name}' is not active.`,
})

function getWebMCPRegistry(): Map<string, WebMCPRegistryEntry> {
  globalThis.__venueWebMCPTools ??= new Map<string, WebMCPRegistryEntry>()
  return globalThis.__venueWebMCPTools
}

function getModelContext(): WebMCPModelContext | undefined {
  if (typeof document !== 'undefined') {
    const documentContext = (document as Document & { modelContext?: WebMCPModelContext })
      .modelContext
    if (documentContext) return documentContext
  }

  if (typeof navigator === 'undefined') return undefined

  return (navigator as Navigator & { modelContext?: WebMCPModelContext }).modelContext
}

function isDuplicateToolNameError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const maybeError = error as { message?: unknown; name?: unknown }
  const message = typeof maybeError.message === 'string' ? maybeError.message : ''
  const name = typeof maybeError.name === 'string' ? maybeError.name : ''

  return name === 'InvalidStateError' && /duplicate tool name/i.test(message)
}

function registerWebMCPTool(
  { name, description, schema }: AgentToolRegistration,
  executeTool: (params: AgentToolParams) => Promise<unknown>,
): () => void {
  const registry = getWebMCPRegistry()
  const entry =
    registry.get(name) ??
    ({
      execute: inactiveToolResult(name),
      registered: false,
      activeConsumers: 0,
    } satisfies WebMCPRegistryEntry)

  entry.execute = executeTool
  entry.activeConsumers += 1
  registry.set(name, entry)

  const modelContext = getModelContext()

  if (!entry.registered && modelContext?.registerTool) {
    try {
      modelContext.registerTool({
        name,
        description,
        inputSchema: schema,
        execute: (params) => entry.execute(params),
      })
      entry.registered = true
    } catch (error) {
      if (isDuplicateToolNameError(error)) {
        entry.registered = true
      } else {
        console.warn(`WebMCP tool registration failed for ${name}:`, error)
      }
    }
  }

  return () => {
    entry.activeConsumers = Math.max(0, entry.activeConsumers - 1)
    if (entry.activeConsumers === 0) {
      entry.execute = inactiveToolResult(name)
    }
  }
}

/**
 * Keeps a React callback registered as an assistant tool without re-registering on each render.
 *
 * Use this hook inside a component when the tool needs access to component state
 * or state setters. The latest callback is stored in a ref, while the registry
 * entry only changes when the tool metadata changes.
 *
 * @template TParams - The expected argument shape for the specific tool.
 * @param registration - Tool name, description, and JSON Schema exposed to the model.
 * @param actionCallback - Local handler called with parsed model arguments.
 */
export function useAgentTool<TParams extends AgentToolParams = AgentToolParams>(
  { name, description, schema }: AgentToolRegistration,
  actionCallback: AgentToolHandler<TParams>,
): void {
  const actionCallbackRef = useRef(actionCallback)

  useEffect(() => {
    actionCallbackRef.current = actionCallback
  }, [actionCallback])

  useEffect(() => {
    const executeTool = async (params: AgentToolParams) => {
      return await actionCallbackRef.current(params as TParams)
    }

    const unregisterWebMCPTool =
      typeof window !== 'undefined'
        ? registerWebMCPTool({ name, description, schema }, executeTool)
        : undefined
    const unregisterLocalTool = registerAgentTool({ name, description, schema }, executeTool)

    return () => {
      unregisterLocalTool()
      unregisterWebMCPTool?.()
    }
  }, [name, description, schema])
}
