import type {
  AgentToolHandler,
  AgentToolParams,
  AgentToolRegistration,
  JsonSchema,
  RegisteredAgentTool,
} from '../types/agentTool'

/**
 * In-memory registry of assistant tools available during the current page session.
 * Components add entries through useAgentTool and remove them automatically on unmount.
 */
const registeredTools = new Map<string, RegisteredAgentTool>()

/**
 * Ensures every registered tool has a valid object schema before provider formatting.
 *
 * @param schema - Optional JSON Schema from the tool registration.
 * @returns The provided schema, or an empty object schema when none was supplied.
 */
function normalizeSchema(schema?: JsonSchema): JsonSchema {
  return schema ?? { type: 'object', properties: {} }
}

/**
 * Converts a tool result into text that can be sent back in a chat-completion tool message.
 *
 * @param result - Any value returned by a local tool handler.
 * @returns A string representation safe for model context.
 */
function stringifyToolResult(result: unknown): string {
  if (result == null) {
    return ''
  }

  if (typeof result === 'string') {
    return result
  }

  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}

/**
 * Detects provider-style content arrays, for example { content: [{ text: "..." }] }.
 *
 * @param result - Unknown tool result to inspect.
 * @returns True when result has a content array that can be flattened.
 */
function hasTextContent(result: unknown): result is { content: unknown[] } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'content' in result &&
    Array.isArray((result as { content?: unknown }).content)
  )
}

/**
 * Registers a callable tool for the in-app assistant and returns an unregister callback.
 *
 * @param registration - Provider-facing name, description, and argument schema.
 * @param handler - Local function executed when the model calls the tool.
 * @returns Cleanup function that removes the tool if the same entry is still registered.
 */
export function registerAgentTool(
  { name, description, schema }: AgentToolRegistration,
  handler: AgentToolHandler,
): () => void {
  if (!name) {
    throw new Error('Agent tools must have a name.')
  }

  const tool = {
    name,
    description,
    inputSchema: normalizeSchema(schema),
    handler,
  }

  registeredTools.set(name, tool)

  return () => {
    if (registeredTools.get(name) === tool) {
      registeredTools.delete(name)
    }
  }
}

/**
 * Lists currently registered tools in provider-neutral format.
 *
 * @returns Tool metadata and schemas without executable handlers.
 */
export function listAgentTools(): AgentToolRegistration[] {
  return Array.from(registeredTools.values()).map(({ name, description, inputSchema }) => ({
    name,
    description,
    schema: inputSchema,
  }))
}

/**
 * Builds OpenAI-compatible function tool definitions for chat-completion requests.
 *
 * @returns Array suitable for the "tools" request field.
 */
export function getOpenAIToolDefinitions(): Array<{
  type: 'function'
  function: {
    name: string
    description: string
    parameters: JsonSchema
  }
}> {
  return listAgentTools().map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: normalizeSchema(tool.schema),
    },
  }))
}

/**
 * Builds Claude-compatible tool definitions from the same local registry.
 *
 * @returns Array suitable for Anthropic-style "tools" request fields.
 */
export function getClaudeToolDefinitions(): Array<{
  name: string
  description: string
  input_schema: JsonSchema
}> {
  return listAgentTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: normalizeSchema(tool.schema),
  }))
}

/**
 * Executes a registered local tool by name.
 *
 * @param name - Tool function name requested by the model.
 * @param args - Parsed model arguments to pass into the handler.
 * @returns Whatever the local handler resolves with.
 * @throws Error when the requested tool name is not registered.
 */
export async function callAgentTool(
  name: string,
  args: AgentToolParams = {},
): Promise<unknown> {
  const tool = registeredTools.get(name)

  if (!tool) {
    throw new Error(`Tool '${name}' is not registered.`)
  }

  return await tool.handler(args)
}

/**
 * Formats a local tool result into the text payload expected by a model tool message.
 *
 * @param result - Raw return value from callAgentTool.
 * @returns String content to send back to the model.
 */
export function formatToolResultForModel(result: unknown): string {
  if (hasTextContent(result) && result.content.length) {
    return result.content
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'text' in item) {
          const text = (item as { text?: unknown }).text
          return typeof text === 'string' ? text : stringifyToolResult(item)
        }

        return stringifyToolResult(item)
      })
      .join('\n')
  }

  return stringifyToolResult(result)
}
