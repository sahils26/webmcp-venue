/**
 * Minimal JSON Schema object accepted by OpenAI-compatible function calling APIs.
 * Keep this intentionally broad so new tool schemas can be added without changing
 * the shared type every time a schema keyword is introduced.
 */
export type JsonSchema = Record<string, unknown>

/**
 * Runtime arguments passed from the model into a registered tool handler.
 * Tool handlers should validate or coerce each field because model output is not
 * guaranteed to match the schema perfectly.
 */
export type AgentToolParams = Record<string, unknown>

/**
 * Function signature for a local tool that can be called by the assistant.
 *
 * @template TParams - The expected argument shape for a specific tool.
 * @param params - Parsed JSON arguments supplied by the model.
 * @returns Any serializable value; it will be formatted before being sent back to the model.
 */
export type AgentToolHandler<TParams extends AgentToolParams = AgentToolParams> = (
  params: TParams,
) => Promise<unknown> | unknown

/**
 * Public metadata needed to expose a tool to an AI provider.
 */
export interface AgentToolRegistration {
  /** Unique function name sent to the model, for example "check_availability". */
  name: string

  /** Natural language instruction that tells the model when to use this tool. */
  description: string

  /** JSON Schema describing the arguments the model should provide. */
  schema?: JsonSchema
}

/**
 * Internal registry entry after defaults and executable handler are attached.
 */
export interface RegisteredAgentTool extends AgentToolRegistration {
  /** Normalized schema guaranteed to exist for provider requests. */
  inputSchema: JsonSchema

  /** Local implementation invoked when the model requests this tool. */
  handler: AgentToolHandler
}
