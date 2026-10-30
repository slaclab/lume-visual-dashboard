const DEFAULT_BASE_URL = 'http://localhost:8000';

export function getBaseUrl(): string {
  return (import.meta.env.VITE_LUME_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export class LumeApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;

  constructor(status: number, body: unknown, url: string) {
    super(LumeApiError.messageFrom(status, body));
    this.name = 'LumeApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }

  /** 4xx errors are caller mistakes and will not succeed on retry. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  private static messageFrom(status: number, body: unknown): string {
    if (body && typeof body === 'object' && 'detail' in body) {
      const { detail } = body as { detail: unknown };
      if (typeof detail === 'string') return `${status}: ${detail}`;
      if (Array.isArray(detail)) {
        const msgs = detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? d.msg : d));
        return `${status}: ${msgs.join('; ')}`;
      }
    }
    if (typeof body === 'string' && body) return `${status}: ${body}`;
    return `Request failed with status ${status}`;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  /** Overrides the lume-model-api base URL, e.g. to call Canopy. */
  baseUrl?: string;
  headers?: Record<string, string>;
}

export async function fetchJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, baseUrl = getBaseUrl(), headers } = options;
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Leave non-JSON bodies (e.g. proxy error pages) as text.
    }
  }

  if (!response.ok) throw new LumeApiError(response.status, parsed, url);
  return parsed as T;
}
