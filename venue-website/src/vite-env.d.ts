/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional venue API base URL. Defaults to same-origin /api via the Vite proxy. */
  readonly VITE_API_BASE_URL?: string

  /** Optional agent API base URL. Defaults to the local Vite proxy at /agent-api. */
  readonly VITE_AGENT_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
