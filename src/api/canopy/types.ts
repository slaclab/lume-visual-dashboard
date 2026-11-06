import type { components } from './schema';

type Schemas = components['schemas'];

/**
 * Current value of a PV. `tsNs` is epoch nanoseconds, which exceeds 2^53, so it loses
 * sub-microsecond precision once parsed; fine for display, not for exact comparisons.
 */
export type PVValue = Schemas['PVValue'];
/** Static display metadata for a PV (units, precision, limits, enum labels). */
export type PVMeta = Schemas['PVMeta'];
export type ValueKind = Schemas['ValueKind'];
export type AlarmSeverity = Schemas['AlarmSeverity'];
export type TableValue = Schemas['TableValue'];

/**
 * Server -> client frames on Hare's WebSocket (`/hare/v1/ws/pvs`). Not in Canopy's OpenAPI
 * schema, so typed by hand from `external/canopy/docs/hare/websocket.md`.
 */
export type HareServerMessage =
  /** Values and metadata for newly subscribed PVs. Several may follow one subscribe; merge by PV. */
  | { type: 'initial'; data: Record<string, PVValue>; meta: Record<string, PVMeta>; count: number }
  /** Changed values only, flushed every ~100 ms. Metadata is never re-sent. */
  | { type: 'diff'; data: Record<string, PVValue>; count: number; timestamp: number }
  /** Every ~5 s. `backend` is the EPICS backend, e.g. `simulation` or `epics`. */
  | { type: 'heartbeat'; timestamp: number; backend: string }
  | { type: 'pong'; timestamp: number }
  /** A bad frame or rejected PV names. The socket stays open. */
  | { type: 'error'; code: string; message: string; pvNames?: string[] };

export type HareClientMessage =
  { type: 'subscribe' | 'unsubscribe'; pvNames: string[] } | { type: 'ping' };

/** One PV on the Hare stream. */
export interface HarePvState {
  /** Latest value; `undefined` until the first `initial` or `diff` for this PV. */
  value: PVValue | undefined;
  /** Display metadata; arrives once the PV connects (possibly after its first value). */
  meta: PVMeta | undefined;
  /** Set when Hare rejected the name at subscribe time (`invalid_pv_name`). */
  rejected: string | undefined;
}

/** Same meanings as the lume-model-api live stream's `LiveStreamStatus`. */
export type HareStreamStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface HareConnectionState {
  status: HareStreamStatus;
  /** Why the socket failed: the last failure while `reconnecting`, the fatal one when `closed`. */
  error: Error | undefined;
  /** The latest connection-level `error` frame from Hare (not tied to a PV). */
  errorMessage: string | undefined;
  /** EPICS backend from the latest heartbeat, e.g. `simulation` or `epics`. */
  backend: string | undefined;
}

export interface HareStreamState extends HareConnectionState {
  /** Keyed by PV name, in the order requested. */
  pvs: Record<string, HarePvState>;
}
