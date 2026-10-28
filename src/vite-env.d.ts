/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of lume-model-api, including any ingress prefix (e.g. `.../lume-model-api`). */
  readonly VITE_LUME_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
