import { fetchJson, LumeApiError } from '../client';
import { getCanopyApiKey, getCanopyBaseUrl } from './client';
import type {
  HareClientMessage,
  HareConnectionState,
  HarePvState,
  HareServerMessage,
  HareStreamState,
} from './types';

/**
 * `ws(s)://…/hare/v1/ws/pvs?api_key=…`. Browsers can't set headers on a WebSocket handshake,
 * so the key goes in the query string, which Hare accepts for this reason.
 */
export function hareWebSocketUrl(
  baseUrl: string = getCanopyBaseUrl(),
  apiKey: string = getCanopyApiKey()
): string {
  const url = new URL(`${baseUrl}/hare/v1/ws/pvs`, globalThis.location?.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('api_key', apiKey);
  return url.toString();
}

/** Drops empty names and duplicates, keeping the first occurrence's order. */
export function normalizePvNames(pvNames: readonly string[]): string[] {
  return [...new Set(pvNames.filter((name) => name !== ''))];
}

/** Reconnect, teardown and liveness timing for the Hare stream. Tests may shorten these. */
export const hareStreamTiming = {
  /** First reconnect delay; doubles per failed attempt and resets once a message arrives. */
  initialRetryMs: 1000,
  maxRetryMs: 30_000,
  /**
   * How long a PV stays subscribed after its last subscriber leaves (and the socket stays
   * open after the last PV), so remounts and route changes don't churn subscriptions.
   */
  teardownMs: 500,
  /** Hare heartbeats every 5 s; silence for this long means a dead socket, so reconnect. */
  staleAfterMs: 15_000,
};

/** Hare drops names beyond 5000 per subscribe frame, so larger sets are split. */
const SUBSCRIBE_CHUNK_SIZE = 1000;

const EMPTY_PV: HarePvState = { value: undefined, meta: undefined, rejected: undefined };

const CONNECTING_STATE: HareConnectionState = {
  status: 'connecting',
  error: undefined,
  errorMessage: undefined,
  backend: undefined,
};

export const IDLE_HARE_STREAM_STATE: HareStreamState = {
  ...CONNECTING_STATE,
  status: 'idle',
  pvs: {},
};

type Timer = ReturnType<typeof setTimeout>;

const connections = new Map<string, HareConnection>();

/**
 * One WebSocket shared by every subscriber of the same Canopy URL and key. PVs are reference
 * counted, so the socket subscribes to the union of what mounted components need.
 */
class HareConnection {
  state: HareConnectionState = CONNECTING_STATE;
  private readonly url: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly pvs = new Map<string, HarePvState>();
  private readonly refs = new Map<string, number>();
  /** Names subscribed on the server (or to subscribe once open), including ones in teardown. */
  private readonly subscribed = new Set<string>();
  private readonly pending = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private readonly releaseTimers = new Set<Timer>();
  private socket: WebSocket | undefined;
  private running = false;
  private disposed = false;
  private flushQueued = false;
  private backoffMs = hareStreamTiming.initialRetryMs;
  private retryTimer: Timer | undefined;
  private staleTimer: Timer | undefined;

  constructor(url: string, baseUrl: string, apiKey: string) {
    this.url = url;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  pv(name: string): HarePvState {
    return this.pvs.get(name) ?? EMPTY_PV;
  }

  addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Holds `names` subscribed until the returned release function is called. */
  acquire(names: readonly string[]): () => void {
    for (const name of names) {
      this.refs.set(name, (this.refs.get(name) ?? 0) + 1);
      if (!this.subscribed.has(name)) {
        this.subscribed.add(name);
        this.pending.add(name);
      }
    }
    // A `closed` (fatal) connection only retries through `reconnect()`.
    if (!this.running && this.state.status !== 'closed') this.start();
    this.queueFlush();

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.release(names);
    };
  }

  /** Drops the socket (or a `closed` stream) and connects again straight away. */
  reconnect(): void {
    if (this.disposed || this.refs.size === 0) return;
    this.detachSocket();
    this.backoffMs = hareStreamTiming.initialRetryMs;
    this.update({ status: 'connecting', error: undefined });
    this.start();
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    this.detachSocket();
    for (const timer of this.releaseTimers) clearTimeout(timer);
    this.listeners.clear();
    if (connections.get(this.url) === this) connections.delete(this.url);
  }

  private release(names: readonly string[]): void {
    for (const name of names) {
      const count = (this.refs.get(name) ?? 1) - 1;
      if (count > 0) this.refs.set(name, count);
      else this.refs.delete(name);
    }
    const timer = setTimeout(() => {
      this.releaseTimers.delete(timer);
      if (this.disposed) return;
      // Re-acquired names (e.g. a StrictMode remount) still have a count and stay subscribed.
      const gone = names.filter((name) => !this.refs.has(name) && this.subscribed.has(name));
      for (const name of gone) {
        this.subscribed.delete(name);
        this.pending.delete(name);
        this.pvs.delete(name);
      }
      if (this.refs.size === 0) {
        this.dispose();
        return;
      }
      this.sendNames('unsubscribe', gone);
    }, hareStreamTiming.teardownMs);
    this.releaseTimers.add(timer);
  }

  private start(): void {
    this.running = true;
    this.connect();
  }

  private connect(): void {
    this.retryTimer = undefined;
    let opened = false;
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      opened = true;
      this.update({ status: 'open', error: undefined });
      this.armWatchdog();
      this.pending.clear();
      this.sendNames('subscribe', [...this.subscribed]);
    };
    socket.onmessage = (event: MessageEvent) => {
      this.armWatchdog();
      this.backoffMs = hareStreamTiming.initialRetryMs;
      if (typeof event.data === 'string') this.handleMessage(event.data);
    };
    socket.onclose = (event: CloseEvent) => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      void this.onDrop(opened, event.code, event.reason);
    };
  }

  /**
   * Browsers report a refused handshake (bad API key) as a plain 1006 close, so a socket that
   * never opened, or one closed with 1008, is followed by a REST call with the same key to tell
   * an auth failure (fatal) from a network problem (retried).
   */
  private async onDrop(opened: boolean, code: number, reason: string): Promise<void> {
    clearTimeout(this.staleTimer);
    if (this.disposed || !this.running) return;
    if (!opened || code === 1008) {
      const authError = await this.checkAuth();
      if (this.disposed || !this.running || this.socket || this.retryTimer) return;
      if (authError) {
        this.running = false;
        this.update({ status: 'closed', error: authError });
        return;
      }
    }
    const error = new Error(`Hare WebSocket closed (code ${code}${reason ? `: ${reason}` : ''})`);
    this.update({ status: 'reconnecting', error });
    this.retryTimer = setTimeout(() => this.connect(), this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 2, hareStreamTiming.maxRetryMs);
  }

  private async checkAuth(): Promise<LumeApiError | undefined> {
    try {
      await fetchJson('/hare/v1/health/summary', {
        baseUrl: this.baseUrl,
        headers: { 'X-API-Key': this.apiKey },
      });
    } catch (error) {
      if (error instanceof LumeApiError && (error.status === 401 || error.status === 403)) {
        return error;
      }
    }
    return undefined;
  }

  private armWatchdog(): void {
    clearTimeout(this.staleTimer);
    this.staleTimer = setTimeout(() => {
      // Don't wait for a closing handshake on a socket that may be dead.
      this.detachSocket();
      void this.onDrop(true, 4000, `no message from Hare for ${hareStreamTiming.staleAfterMs} ms`);
    }, hareStreamTiming.staleAfterMs);
  }

  private detachSocket(): void {
    clearTimeout(this.retryTimer);
    clearTimeout(this.staleTimer);
    this.retryTimer = undefined;
    const socket = this.socket;
    this.socket = undefined;
    if (socket && socket.readyState !== WebSocket.CLOSED) socket.close(1000);
  }

  private handleMessage(raw: string): void {
    let message: HareServerMessage;
    try {
      message = JSON.parse(raw) as HareServerMessage;
    } catch {
      return;
    }
    switch (message.type) {
      case 'initial':
      case 'diff': {
        let changed = false;
        for (const [name, value] of Object.entries(message.data ?? {})) {
          changed = this.patchPv(name, { value }) || changed;
        }
        if (message.type === 'initial') {
          for (const [name, meta] of Object.entries(message.meta ?? {})) {
            changed = this.patchPv(name, { meta }) || changed;
          }
        }
        if (changed) this.emit();
        break;
      }
      case 'heartbeat':
        if (message.backend !== this.state.backend) this.update({ backend: message.backend });
        break;
      case 'error':
        if (message.pvNames?.length) {
          let changed = false;
          for (const name of message.pvNames) {
            changed = this.patchPv(name, { rejected: message.message }) || changed;
          }
          if (changed) this.emit();
        } else {
          this.update({ errorMessage: message.message });
        }
        break;
    }
  }

  /** Ignores names this client no longer holds (e.g. a diff racing an unsubscribe). */
  private patchPv(name: string, patch: Partial<HarePvState>): boolean {
    if (!this.subscribed.has(name)) return false;
    this.pvs.set(name, { ...this.pv(name), ...patch });
    return true;
  }

  private queueFlush(): void {
    if (this.flushQueued) return;
    this.flushQueued = true;
    // Components mounting in the same render each acquire their PVs; send one subscribe.
    queueMicrotask(() => {
      this.flushQueued = false;
      if (this.socket?.readyState !== WebSocket.OPEN || this.pending.size === 0) return;
      const names = [...this.pending];
      this.pending.clear();
      this.sendNames('subscribe', names);
    });
  }

  private sendNames(type: 'subscribe' | 'unsubscribe', names: string[]): void {
    for (let i = 0; i < names.length; i += SUBSCRIBE_CHUNK_SIZE) {
      this.send({ type, pvNames: names.slice(i, i + SUBSCRIBE_CHUNK_SIZE) });
    }
  }

  private send(message: HareClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private update(patch: Partial<HareConnectionState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** A shared Hare subscription to a set of PVs, in the shape `useSyncExternalStore` expects. */
export interface HareStreamHandle {
  /** Subscribes the PVs (opening the socket if needed); the returned function releases them. */
  subscribe(listener: () => void): () => void;
  /** The latest state for these PVs. Stable until one of them or the connection changes. */
  getSnapshot(): HareStreamState;
  /** Connects again now, e.g. from a "Retry" button once `status` is `closed`. */
  reconnect(): void;
}

/**
 * Live values for `pvNames` from Canopy's Hare WebSocket. Every handle for the same Canopy URL
 * and key shares one socket; each PV is subscribed once, however many components watch it.
 */
export function hareStream(pvNames: readonly string[]): HareStreamHandle {
  const names = normalizePvNames(pvNames);
  const baseUrl = getCanopyBaseUrl();
  const apiKey = getCanopyApiKey();
  const url = hareWebSocketUrl(baseUrl, apiKey);

  let cached: HareStreamState | undefined;
  let cachedConnection: HareConnectionState | undefined;
  let cachedEntries: HarePvState[] = [];

  return {
    subscribe(listener) {
      let connection = connections.get(url);
      if (!connection) {
        connection = new HareConnection(url, baseUrl, apiKey);
        connections.set(url, connection);
      }
      const removeListener = connection.addListener(listener);
      const release = connection.acquire(names);
      return () => {
        removeListener();
        release();
      };
    },
    getSnapshot() {
      const connection = connections.get(url);
      const connectionState = connection?.state ?? CONNECTING_STATE;
      const entries = names.map((name) => connection?.pv(name) ?? EMPTY_PV);
      if (
        cached &&
        cachedConnection === connectionState &&
        entries.every((entry, i) => entry === cachedEntries[i])
      ) {
        return cached;
      }
      cachedConnection = connectionState;
      cachedEntries = entries;
      cached = {
        ...connectionState,
        pvs: Object.fromEntries(names.map((name, i) => [name, entries[i]])),
      };
      return cached;
    },
    reconnect: () => connections.get(url)?.reconnect(),
  };
}

/** Closes every Hare socket immediately, e.g. between tests. */
export function closeAllHareStreams(): void {
  for (const connection of [...connections.values()]) connection.dispose();
}
