import { getRuntimeConfig } from '../../runtimeConfig';
import { fetchJson, type RequestOptions } from '../client';

const DEFAULT_BASE_URL = 'http://localhost:8050';
const DEFAULT_API_KEY = 'dev';

/** False when the deployment's runtime config sets `canopyApiBaseUrl: null`. */
export function isCanopyConfigured(): boolean {
  return getRuntimeConfig().canopyApiBaseUrl !== null;
}

export function getCanopyBaseUrl(): string {
  return (
    getRuntimeConfig().canopyApiBaseUrl ||
    import.meta.env.VITE_CANOPY_API_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
}

export function getCanopyApiKey(): string {
  return getRuntimeConfig().canopyApiKey || import.meta.env.VITE_CANOPY_API_KEY || DEFAULT_API_KEY;
}

/** `fetchJson` against Canopy, authenticated with `X-API-Key`. Errors are `LumeApiError`s. */
export function canopyFetch<T>(
  path: string,
  options: Omit<RequestOptions, 'baseUrl'> = {}
): Promise<T> {
  return fetchJson<T>(path, {
    ...options,
    baseUrl: getCanopyBaseUrl(),
    headers: { 'X-API-Key': getCanopyApiKey(), ...options.headers },
  });
}
