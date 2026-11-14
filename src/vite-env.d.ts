/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of lume-model-api, including any ingress prefix (e.g. `.../lume-model-api`). */
  readonly VITE_LUME_API_BASE_URL?: string;
  /** Base URL of the Canopy API (Hare is mounted at `/hare`), including any ingress prefix. */
  readonly VITE_CANOPY_API_BASE_URL?: string;
  /** Canopy API key sent as `X-API-Key`. Bundled into the client, so use a read-only key. */
  readonly VITE_CANOPY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
