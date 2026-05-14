import { useEffect, useRef } from 'react'
import { registerAgentTool } from '../lib/toolRegistry'
import type { AgentToolHandler, AgentToolParams, AgentToolRegistration } from '../types/agentTool'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelContext = (navigator as any)?.modelContext
    let unregisterLocalTool: (() => void) | undefined
    let unregisterWebMCPTool: (() => void) | undefined

    const executeTool = async (params: AgentToolParams) => {
      return await actionCallbackRef.current(params as TParams)
    }

    if (typeof window !== 'undefined' && modelContext?.registerTool) {
      try {
        const registration = modelContext.registerTool({
          name,
          description,
          inputSchema: schema,
          execute: executeTool,
        })

        unregisterWebMCPTool = () => {
          if (registration && typeof registration.unregister === 'function') {
            registration.unregister()
          }
        }
      } catch (error) {
        console.warn(`WebMCP tool registration failed for ${name}:`, error)
      }
    }

    // eslint-disable-next-line prefer-const
    unregisterLocalTool = registerAgentTool({ name, description, schema }, executeTool)

    return () => {
      unregisterLocalTool?.()
      unregisterWebMCPTool?.()
    }
  }, [name, description, schema])
}
