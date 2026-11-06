const DEFAULT_BASE_URL = 'http://localhost:8000';

export function getBaseUrl(): string {
  return (import.meta.env.VITE_LUME_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export class LumeApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;
  /**
   * From the `Retry-After` header, if present. Cross-origin, browsers only expose it when the
   * server lists it in `Access-Control-Expose-Headers`.
   */
  readonly retryAfterMs: number | undefined;

  constructor(status: number, body: unknown, url: string, retryAfterMs?: number) {
    super(LumeApiError.messageFrom(status, body));
    this.name = 'LumeApiError';
    this.status = status;
    this.body = body;
    this.url = url;
    this.retryAfterMs = retryAfterMs;
  }

  /** Builds the error from a non-OK response, reading its body. */
  static async fromResponse(response: Response, url: string): Promise<LumeApiError> {
    return new LumeApiError(
      response.status,
      await readResponseBody(response),
      url,
      parseRetryAfter(response.headers.get('Retry-After'))
    );
  }

  /** 4xx errors are caller mistakes and will not succeed on retry. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** The body is a FastAPI `{"detail": ...}`, so the API itself answered (not a proxy). */
  get hasDetail(): boolean {
    return !!this.body && typeof this.body === 'object' && 'detail' in this.body;
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

  if (!response.ok) throw await LumeApiError.fromResponse(response, url);
  return (await readResponseBody(response)) as T;
}

/** Parsed JSON, or the raw text for non-JSON bodies (e.g. proxy error pages). */
export async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** `Retry-After` (delay in seconds, or an HTTP date) in ms. */
export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}
