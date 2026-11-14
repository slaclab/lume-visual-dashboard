/**
 * Settings a deployment can change without rebuilding the image. `config.js` (served next to
 * `index.html`, and replaced per environment by a Kubernetes ConfigMap) sets
 * `window.__LUME_DASHBOARD_CONFIG__` before the app loads. `canopy-key.js`, loaded next and
 * replaced per environment by a Kubernetes Secret, adds `canopyApiKey`. Unset keys fall back to
 * the `VITE_*` build-time variables, then to the local docker compose defaults.
 */
export interface RuntimeConfig {
  lumeApiBaseUrl?: string;
  /** `null` turns Canopy off: the Canopy page says so instead of connecting. */
  canopyApiBaseUrl?: string | null;
  /** Sent to the browser, so use a read-only key. */
  canopyApiKey?: string;
}

declare global {
  interface Window {
    __LUME_DASHBOARD_CONFIG__?: RuntimeConfig;
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return globalThis.window?.__LUME_DASHBOARD_CONFIG__ ?? {};
}
