import { getBaseUrl, LumeApiError } from './client';
import { decodeEvaluateResponse } from './decode';
import { modelPath } from './endpoints';
import { parseEventStream } from './sse';
import type {
  EvaluateV1WireResponse,
  LiveStreamEvent,
  LiveStreamRequest,
  LiveStreamState,
} from './types';

/**
 * Equivalent requests (reordered or duplicate outputs, an empty screen) map to one shared
 * connection, as they map to one evaluation loop on the server.
 */
export function normalizeLiveStreamRequest(request: LiveStreamRequest): LiveStreamRequest {
  const outputs = (request.outputs ?? []).map((id) => id.trim()).filter(Boolean);
  const normalized: LiveStreamRequest = { outputs: [...new Set(outputs)].sort() };
  if (request.screen) normalized.screen = request.screen;
  return normalized;
}

export function hasLiveStreamTargets(request: LiveStreamRequest): boolean {
  return (request.outputs?.length ?? 0) > 0 || !!request.screen;
}

export function liveStreamUrl(name: string, request: LiveStreamRequest): string {
  const { screen, outputs } = normalizeLiveStreamRequest(request);
  const params = new URLSearchParams();
  if (screen) params.set('screen', screen);
  if (outputs?.length) params.set('outputs', outputs.join(','));
  const query = params.toString();
  return `${getBaseUrl()}${modelPath(name)}/live/stream${query ? `?${query}` : ''}`;
}

export interface OpenLiveStreamOptions {
  signal?: AbortSignal;
  /** Called once the server has accepted the stream, before the first event. */
  onOpen?: () => void;
  /** Called with the reconnection delay from a `retry:` field, if the server sends one. */
  onRetry?: (ms: number) => void;
}

/**
 * One connection to `GET /api/v1/models/{name}/live/stream`, as decoded events. Unlike
 * `EventSource`, an HTTP error before the stream opens (bad screen or output id, unknown model,
 * live not served, live loop limit) throws a `LumeApiError` with the server's `detail`.
 * It does not reconnect: when the server ends the stream the iteration ends. Use
 * `liveStream`/`useLiveStream` for a shared, reconnecting subscription.
 */
export async function* openLiveStream(
  name: string,
  request: LiveStreamRequest,
  { signal, onOpen, onRetry }: OpenLiveStreamOptions = {}
): AsyncGenerator<LiveStreamEvent> {
  const url = liveStreamUrl(name, request);
  const response = await fetch(url, {
    signal,
    cache: 'no-store',
    headers: { Accept: 'text/event-stream' },
  });
  if (!response.ok) throw await LumeApiError.fromResponse(response, url);
  if (!response.body) throw new Error(`Live stream ${url} returned no body`);
  onOpen?.();

  for await (const message of parseEventStream(response.body, { signal, onRetry })) {
    if (message.event === 'frame') {
      const wire = JSON.parse(message.data) as EvaluateV1WireResponse;
      yield { type: 'frame', frame: decodeEvaluateResponse(wire) };
    } else if (message.event === 'error') {
      yield { type: 'error', message: errorMessageFrom(message.data) };
    }
  }
}

function errorMessageFrom(data: string): string {
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      if (typeof parsed.message === 'string') return parsed.message;
    }
  } catch {
    // Not JSON: use the raw data.
  }
  return data;
}

/** Reconnect and teardown timing for shared live streams. Tests may shorten these. */
export const liveStreamTiming = {
  /** First reconnect delay; doubles per failed attempt and resets once a frame arrives. */
  initialRetryMs: 1000,
  maxRetryMs: 30_000,
  /**
   * How long a connection outlives its last subscriber, so a remount (React StrictMode, or
   * navigating between views of the same stream) reuses it instead of reconnecting.
   */
  teardownMs: 500,
};

const CONNECTING_STATE: LiveStreamState = {
  status: 'connecting',
  frame: undefined,
  errorMessage: undefined,
  error: undefined,
};

export const IDLE_LIVE_STREAM_STATE: LiveStreamState = { ...CONNECTING_STATE, status: 'idle' };

/**
 * Retrying can't fix these: the request is wrong (4xx), or the API itself refused the stream
 * with a 503 and no `Retry-After` (live not served by this deployment, or the loop limit). A 503
 * without a JSON `detail` comes from a proxy or ingress, e.g. while the pod restarts, and is
 * retried.
 */
function isFatal(error: Error): boolean {
  if (!(error instanceof LumeApiError) || error.retryAfterMs !== undefined) return false;
  if (error.status === 408 || error.status === 429) return false;
  return error.isClientError || (error.status === 503 && error.hasDetail);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

const connections = new Map<string, LiveStreamConnection>();

class LiveStreamConnection {
  state: LiveStreamState = CONNECTING_STATE;
  private readonly key: string;
  private readonly name: string;
  private readonly request: LiveStreamRequest;
  private readonly listeners = new Set<() => void>();
  private controller: AbortController | undefined;
  private teardownTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(key: string, name: string, request: LiveStreamRequest) {
    this.key = key;
    this.name = name;
    this.request = request;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    clearTimeout(this.teardownTimer);
    this.teardownTimer = undefined;
    if (!this.controller) this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.teardownTimer === undefined) {
        this.teardownTimer = setTimeout(() => this.dispose(), liveStreamTiming.teardownMs);
      }
    };
  }

  /** Drops the current connection (or a `closed` stream) and connects again straight away. */
  reconnect(): void {
    if (this.listeners.size === 0) return;
    this.controller?.abort();
    this.update({ status: 'connecting', error: undefined });
    this.start();
  }

  dispose(): void {
    clearTimeout(this.teardownTimer);
    this.controller?.abort();
    this.listeners.clear();
    if (connections.get(this.key) === this) connections.delete(this.key);
  }

  private update(patch: Partial<LiveStreamState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private start(): void {
    this.controller = new AbortController();
    void this.run(this.controller.signal);
  }

  private async run(signal: AbortSignal): Promise<void> {
    let backoffMs = liveStreamTiming.initialRetryMs;
    let serverRetryMs: number | undefined;

    while (!signal.aborted) {
      let delayMs: number;
      try {
        const events = openLiveStream(this.name, this.request, {
          signal,
          onOpen: () => {
            if (!signal.aborted) this.update({ status: 'open', error: undefined });
          },
          onRetry: (ms) => (serverRetryMs = ms),
        });
        for await (const event of events) {
          if (signal.aborted) return;
          if (event.type === 'frame') {
            backoffMs = liveStreamTiming.initialRetryMs;
            this.update({ frame: event.frame, errorMessage: undefined });
          } else {
            this.update({ errorMessage: event.message });
          }
        }
        // The server ended the stream. It does this after a dead pool's error event, and the
        // pod restarts, so reconnect.
        delayMs = serverRetryMs ?? backoffMs;
      } catch (caught) {
        if (signal.aborted) return;
        const error = caught instanceof Error ? caught : new Error(String(caught));
        if (isFatal(error)) {
          this.update({ status: 'closed', error });
          return;
        }
        this.update({ error });
        delayMs =
          (error instanceof LumeApiError ? error.retryAfterMs : undefined) ??
          serverRetryMs ??
          backoffMs;
      }
      if (signal.aborted) return;
      this.update({ status: 'reconnecting' });
      await sleep(delayMs, signal);
      backoffMs = Math.min(backoffMs * 2, liveStreamTiming.maxRetryMs);
    }
  }
}

/** A shared, reconnecting live stream, in the shape `useSyncExternalStore` expects. */
export interface LiveStreamHandle {
  /** Connects on the first subscriber; disconnects shortly after the last one leaves. */
  subscribe(listener: () => void): () => void;
  /** The latest state. Stable between changes. */
  getSnapshot(): LiveStreamState;
  /** Connects again now, e.g. from a "Retry" button once the stream is `closed`. */
  reconnect(): void;
}

/**
 * Subscribers to the same model and (normalized) request share one HTTP connection, which
 * matters because browsers allow only ~6 HTTP/1.1 connections per origin. Only the latest
 * frame is kept. Dropped connections reconnect with exponential backoff; errors that retrying
 * can't fix end in `status: 'closed'`.
 */
export function liveStream(name: string, request: LiveStreamRequest): LiveStreamHandle {
  const normalized = normalizeLiveStreamRequest(request);
  const key = JSON.stringify([name, normalized]);
  return {
    subscribe: (listener) => {
      let connection = connections.get(key);
      if (!connection) {
        connection = new LiveStreamConnection(key, name, normalized);
        connections.set(key, connection);
      }
      return connection.subscribe(listener);
    },
    getSnapshot: () => connections.get(key)?.state ?? CONNECTING_STATE,
    reconnect: () => connections.get(key)?.reconnect(),
  };
}

/** Closes every shared live stream immediately, e.g. between tests. */
export function closeAllLiveStreams(): void {
  for (const connection of [...connections.values()]) connection.dispose();
}
