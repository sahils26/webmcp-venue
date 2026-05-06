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
    return registerAgentTool({ name, description, schema }, async (params) => {
      return await actionCallbackRef.current(params as TParams)
    })
  }, [name, description, schema])
}
