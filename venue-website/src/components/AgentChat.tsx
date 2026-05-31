import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import {
  callAgentTool,
  formatToolResultForModel,
  getOpenAIToolDefinitions,
} from '../lib/toolRegistry'
import './style/AgentChat.scss'

type ChatState = 'closed' | 'minimized' | 'open'
type ChatMessageRole = 'assistant' | 'user'
type ChatMessageVariant = 'error'

/**
 * UI message rendered in the chat transcript.
 */
interface ChatMessage {
  /** Client-generated id used as the React list key. */
  id: string

  /** Transcript side that controls visual alignment and message styling. */
  role: ChatMessageRole

  /** Text displayed in the chat bubble. */
  content: string

  /** Optional display variant for non-standard assistant messages. */
  variant?: ChatMessageVariant
}

/**
 * Function call request returned by an OpenAI-compatible chat-completion response.
 */
interface ToolCall {
  /** Provider-generated id that must be echoed in the tool response message. */
  id: string

  /** Requested tool name and raw JSON arguments. */
  function: {
    name: string
    arguments?: string
  }
}

/**
 * Assistant message shape returned by the model.
 */
interface AssistantCompletionMessage {
  role: 'assistant'

  /** Natural language response when the model is done calling tools. */
  content?: string | null

  /** One or more tool calls requested by the model. */
  tool_calls?: ToolCall[]
}

/**
 * Message shape sent to the OpenAI-compatible chat-completion endpoint.
 */
interface ChatRequestMessage {
  role: 'system' | 'assistant' | 'user' | 'tool'

  /** Text content for system, user, assistant, or tool messages. */
  content?: string | null

  /** Tool name included on tool response messages. */
  name?: string

  /** Tool call id included on tool response messages. */
  tool_call_id?: string

  /** Tool calls included when replaying assistant tool-call messages. */
  tool_calls?: ToolCall[]
}

/**
 * Minimal response contract used from the OpenAI-compatible provider.
 */
interface ChatCompletionResponse {
  choices?: Array<{
    message?: AssistantCompletionMessage
  }>
  error?: {
    message?: string
  }
}

const MAX_TOOL_STEPS = 8
const TOOL_SYNTAX_LEAK_FALLBACK =
  'I can help with that. Please share your event date, and I can check which venues are available. If you do not have a date yet, I can show the current venue options and their next available dates.'
const TOOL_CALL_ERROR_FALLBACK =
  'I could not match that request cleanly with the venue tools. Please try asking by guest count, capacity range, event type, date, or facilities.'
const STARTER_MESSAGE =
  'Hi! I can help you compare venue spaces, check room availability for a date, find rooms by guest count or facilities, and prepare a quote request.'
const INTERNAL_TOOL_SYNTAX_PATTERNS = [
  /<\/?function\b/i,
  /\bfunction_call\b/i,
  /\btool_calls?\b/i,
  /\b(call|invoke|use)\s+[`'"]?(check_availability|get_pricing|get_room_details|list_available_venues|prepare_quote_request|search_venues)\b/i,
  /\b(check_availability|get_pricing|get_room_details|list_available_venues|prepare_quote_request|search_venues)\s*\(/i,
]
const LEGACY_STORAGE_KEY = 'agentChatMessages'

/**
 * System guardrails that keep the assistant scoped to venue planning tasks.
 */
const SYSTEM_MESSAGE: ChatRequestMessage = {
  role: 'system',
  content: `You are the official venue planning assistant for spaces360 and Venue XYZ. Your ONLY job is to help users find event spaces, check availability, and request quotes.

STRICT RULES:
1. Do NOT answer questions that are unrelated to event planning, venue booking, or spaces360.
2. If a user asks a general knowledge question (e.g., math, coding, cooking, politics, history), you must politely decline and steer the conversation back to event venues.
3. Example refusal: "I'm a dedicated event planning assistant, so I can't help with that. But I'd love to help you find the perfect room for your next event!"
4. Use the available tools to fetch live data whenever asked about specific rooms or dates.
5. Before preparing a quote request, check availability for that room and date. Do not prepare a quote request for a room/date that is booked or unavailable.
6. All venue prices are in EUR. When giving prices, use the euro-formatted value from the tool result, such as "€1,200 per day"; never convert or display prices as USD/dollars.
7. Keep answers concise, professional, and practical.
8. Every visible answer must be plain English for an event planner. Never mention internal tools, function names, JSON, XML-style tags, code snippets, or that you can "call" a function.
9. Use tools silently when needed. After receiving tool results, answer the user unless another tool call is strictly necessary.
10. When a user asks which venues, rooms, or spaces are available, use the available venue-listing tool. If no date is provided, list the venue options with their next available dates and ask for the event date only if they need date-specific availability.
11. When a user asks for venues by guest count, capacity range, event type, facilities, atmosphere, or general planning details, use the venue search tool. It can return exact matches or close suggestions.
12. If the venue search tool says there is no exact match, explain that clearly and then summarize the suggested venues and why they are close.
13. When a user asks you to fill, prepare, or complete the quote form, collect the room name, event date, and email address. Once all three are known, use the quote request tool and remind the user that they must review the form and click submit.`,
}

interface AgentChatProps {
  minimizeRequestKey?: number
  pageContext?: string
}

/**
 * Builds a transcript message for local UI state.
 *
 * @param role - Message owner used for alignment and styling.
 * @param content - Text displayed in the transcript.
 * @param variant - Optional styling variant, currently used for errors.
 * @returns ChatMessage ready to append to state.
 */
function createMessage(
  role: ChatMessageRole,
  content: string,
  variant?: ChatMessageVariant,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    variant,
  }
}

function isToolArgumentRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parses raw JSON arguments returned by the model for a tool call.
 *
 * @param rawArguments - JSON string from toolCall.function.arguments.
 * @returns Parsed object, or an empty object when arguments are missing or invalid.
 */
function parseToolArguments(rawArguments?: string): Record<string, unknown> {
  if (!rawArguments) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawArguments) as unknown
    return isToolArgumentRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Calls the OpenAI-compatible chat completion endpoint with registered tools.
 *
 * @param messages - Conversation messages, including system and tool messages.
 * @param tools - Tool definitions generated from the local registry.
 * @param signal - AbortSignal used to cancel stale requests.
 * @returns The assistant message returned by the provider.
 * @throws Error when the API key is missing or the provider returns an error.
 */
async function requestChatCompletion(
  messages: ChatRequestMessage[],
  tools: ReturnType<typeof getOpenAIToolDefinitions>,
  signal: AbortSignal,
): Promise<AssistantCompletionMessage | undefined> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Missing VITE_GROQ_API_KEY in your local environment.')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
    }),
  })

  const data = (await response.json()) as ChatCompletionResponse

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? 'The assistant request failed.')
  }

  return data.choices?.[0]?.message
}

/**
 * Normalizes unknown caught values into a user-visible error message.
 *
 * @param error - Unknown value caught from async chat/tool work.
 * @returns Safe fallback text for the assistant transcript.
 */
function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'The assistant request failed.'
  }

  if (/failed_generation|failed to call a function/i.test(error.message)) {
    return TOOL_CALL_ERROR_FALLBACK
  }

  return error.message
}

function hasInternalToolSyntax(content: string): boolean {
  return INTERNAL_TOOL_SYNTAX_PATTERNS.some((pattern) => pattern.test(content))
}

/**
 * Keeps provider/tool syntax out of the visible chat transcript.
 *
 * @param content - Raw assistant text returned by the model.
 * @returns Plain-English content safe to render in the chat UI.
 */
function getAssistantDisplayContent(content?: string | null): string {
  const displayContent = content?.trim() || 'Done.'

  return hasInternalToolSyntax(displayContent) ? TOOL_SYNTAX_LEAK_FALLBACK : displayContent
}

export default function AgentChat({ minimizeRequestKey = 0, pageContext }: AgentChatProps) {
  const [chatState, setChatState] = useState<ChatState>('closed')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const activeRunIdRef = useRef(0)
  const handledMinimizeRequestKeyRef = useRef(minimizeRequestKey)

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // Ignore storage errors so the widget can still run in restricted browsers.
    }
  }, [])

  const submitMessage = async (messageText: string) => {
    const trimmedInput = messageText.trim()

    if (!trimmedInput || isLoading) {
      return
    }

    const userMessage = createMessage('user', trimmedInput)
    const nextMessages = [...messages, userMessage]
    const runId = activeRunIdRef.current + 1
    const abortController = new AbortController()
    const isCurrentRun = () => activeRunIdRef.current === runId

    activeRunIdRef.current = runId
    abortControllerRef.current?.abort()
    abortControllerRef.current = abortController
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    setToolStatus('')

    try {
      const tools = getOpenAIToolDefinitions()
      const chatMessages: ChatRequestMessage[] = [
        SYSTEM_MESSAGE,
        ...(pageContext ? [{ role: 'system' as const, content: pageContext }] : []),
        ...nextMessages.map(({ role, content }) => ({ role, content })),
      ]

      // Allow the model to call tools and then continue reasoning with the results.
      // The step limit prevents an accidental infinite tool-call loop.
      for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
        const assistantMessage = await requestChatCompletion(
          chatMessages,
          tools,
          abortController.signal,
        )

        if (!isCurrentRun()) {
          return
        }

        if (!assistantMessage) {
          throw new Error('The assistant returned an empty response.')
        }

        if (!assistantMessage.tool_calls?.length) {
          setMessages((currentMessages) => [
            ...currentMessages,
            createMessage('assistant', getAssistantDisplayContent(assistantMessage.content)),
          ])
          setIsLoading(false)
          return
        }

        chatMessages.push(assistantMessage)

        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name
          const toolArgs = parseToolArguments(toolCall.function.arguments)

          setToolStatus(`Checking ${toolName.replaceAll('_', ' ')}...`)

          const toolResult = await callAgentTool(toolName, toolArgs)

          if (!isCurrentRun()) {
            return
          }

          chatMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: formatToolResultForModel(toolResult),
          })
        }
      }

      throw new Error(
        'The assistant used several tool rounds without producing a final answer. Try a narrower question.',
      )
    } catch (error) {
      if (!isCurrentRun()) {
        return
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', getErrorMessage(error), 'error'),
      ])
      setIsLoading(false)
    } finally {
      setToolStatus('')
    }
  }

  useEffect(() => {
    if (chatState === 'open') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [chatState, messages, isLoading, toolStatus])

  useEffect(() => {
    if (minimizeRequestKey === handledMinimizeRequestKeyRef.current) {
      return
    }

    handledMinimizeRequestKeyRef.current = minimizeRequestKey

    if (minimizeRequestKey > 0) {
      setChatState('minimized')
    }
  }, [minimizeRequestKey])

  const handleOpen = () => {
    setChatState('open')
  }

  const handleMinimize = () => {
    setChatState('minimized')
  }

  const handleClose = () => {
    activeRunIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setMessages([])
    setInput('')
    setIsLoading(false)
    setToolStatus('')
    setChatState('closed')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitMessage(input)
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const statusLabel = isLoading ? toolStatus || 'Working' : 'Ready'

  if (chatState === 'closed') {
    return (
      <div className="agent-chat-shell">
        <button
          className="agent-chat-launcher"
          type="button"
          onClick={handleOpen}
          aria-controls="agent-chat-panel"
          aria-expanded="false"
        >
          <span className="agent-chat-launcher__mark" aria-hidden="true">
            AI
          </span>
          <span className="agent-chat-launcher__copy">
            <span className="agent-chat-launcher__title">spaces360 Assistant</span>
            <span className="agent-chat-launcher__status">Open chat</span>
          </span>
        </button>
      </div>
    )
  }

  if (chatState === 'minimized') {
    return (
      <div className="agent-chat-shell">
        <section
          className="agent-chat agent-chat--minimized"
          aria-label="spaces360 Assistant minimized"
        >
          <button
            className="agent-chat__minimized-toggle"
            type="button"
            onClick={handleOpen}
            aria-controls="agent-chat-panel"
            aria-expanded="false"
          >
            <span className="agent-chat__minimized-mark" aria-hidden="true">
              AI
            </span>
            <span className="agent-chat__minimized-copy">
              <span className="agent-chat__minimized-title">spaces360 Assistant</span>
              <span className="agent-chat__minimized-status">{statusLabel}</span>
            </span>
          </button>

          <button
            className="agent-chat__icon-button"
            type="button"
            onClick={handleOpen}
            aria-label="Open chat"
            title="Open chat"
          >
            <span aria-hidden="true">+</span>
          </button>
          <button
            className="agent-chat__icon-button"
            type="button"
            onClick={handleClose}
            aria-label="Close chat and reset conversation"
            title="Close chat"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="agent-chat-shell">
      <section
        id="agent-chat-panel"
        className="agent-chat agent-chat--open"
        aria-labelledby="agent-chat-title"
      >
        <div className="agent-chat__header">
          <div className="agent-chat__identity">
            <span className="agent-chat__mark" aria-hidden="true">
              AI
            </span>
            <div>
              <p className="agent-chat__eyebrow">AI planner</p>
              <h2 id="agent-chat-title" className="agent-chat__title">
                spaces360 Assistant
              </h2>
            </div>
          </div>

          <div className="agent-chat__window-actions">
            <span className="agent-chat__status">{statusLabel}</span>
            <button
              className="agent-chat__icon-button"
              type="button"
              onClick={handleMinimize}
              aria-label="Minimize chat"
              title="Minimize chat"
            >
              <span aria-hidden="true">&minus;</span>
            </button>
            <button
              className="agent-chat__icon-button"
              type="button"
              onClick={handleClose}
              aria-label="Close chat and reset conversation"
              title="Close chat"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>

        <div className="agent-chat__messages" aria-live="polite">
          {messages.length === 0 && !isLoading && (
            <article className="agent-chat__message agent-chat__message--assistant agent-chat__message--placeholder">
              <p>{STARTER_MESSAGE}</p>
            </article>
          )}

          {messages.map((message) => (
            <article
              className={`agent-chat__message agent-chat__message--${message.role} ${
                message.variant ? `agent-chat__message--${message.variant}` : ''
              }`}
              key={message.id}
            >
              <p>{message.content}</p>
            </article>
          ))}

          {(isLoading || toolStatus) && (
            <div className="agent-chat__thinking">
              <span></span>
              <span></span>
              <span></span>
              <p>{toolStatus || 'Thinking...'}</p>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        <form className="agent-chat__composer" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask about rooms, dates, or quotes"
            rows={2}
            disabled={isLoading}
          ></textarea>
          <button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </button>
        </form>
      </section>
    </div>
  )
}
