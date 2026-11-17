import { getRuntimeConfig } from '@/runtimeConfig';
import { fetchJson, type RequestOptions } from '@api/client';

const DEFAULT_BASE_URL = 'http://localhost:8000';

export function getLumeBaseUrl(): string {
  return (
    getRuntimeConfig().lumeApiBaseUrl ||
    import.meta.env.VITE_LUME_API_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
}

/** `fetchJson` against lume-model-api. */
export function lumeFetch<T>(
  path: string,
  options: Omit<RequestOptions, 'baseUrl'> = {}
): Promise<T> {
  return fetchJson<T>(path, { ...options, baseUrl: getLumeBaseUrl() });
}
