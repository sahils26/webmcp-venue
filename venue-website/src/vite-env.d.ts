/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Groq API key used by the OpenAI-compatible chat-completion endpoint. */
  readonly VITE_GROQ_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
