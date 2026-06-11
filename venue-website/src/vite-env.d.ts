/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional agent API base URL. Defaults to the local Vite proxy at /agent-api. */
  readonly VITE_AGENT_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
