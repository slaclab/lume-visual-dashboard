import { useMemo } from 'react';
import { isCanopyConfigured } from '../api/canopy/client';
import {
  harePvNames,
  snapshotFromHare,
  snapshotFromLiveFrame,
  type ModelStreamSnapshot,
  type ModelStreamSource,
} from '../api/modelStream';
import type { ConfigResponse, LiveStreamStatus } from '../api/types';
import { useHareStream } from './useHare';
import { useThrottledValue } from './useThrottledValue';
import { useLiveStream } from './useLiveStream';

/** How often the shown values may change. Tests may shorten it. */
export const modelStreamTiming = {
  /** Streams can update many times a second; the page re-renders at most once per interval. */
  displayIntervalMs: 1000,
};

export interface UseModelStreamOptions {
  /** lume only: the screen whose particles and image outputs to add. */
  screen?: string;
  /** Set `false` to disconnect. Default `true`. */
  enabled?: boolean;
  /** Minimum time between snapshot changes. Default `modelStreamTiming.displayIntervalMs`. */
  intervalMs?: number;
}

export interface UseModelStreamResult {
  status: LiveStreamStatus;
  /** The latest values, throttled to `intervalMs`; `undefined` until the first values or while idle. */
  snapshot: ModelStreamSnapshot | undefined;
  error: Error | undefined;
  errorMessage: string | undefined;
  /** canopy only: the EPICS backend from Hare's heartbeat, e.g. `epics` or `simulation`. */
  backend: string | undefined;
  /** False when this deployment has no Canopy; the source never connects. */
  available: boolean;
  reconnect: () => void;
}

/**
 * A model's live inputs and outputs from either source. lume-model-api evaluates the model at
 * the machine's inputs; Canopy's Hare streams the input PVs and the measured output PVs.
 * Both hooks always run (rules of hooks), but only the selected source connects.
 */
export function useModelStream(
  source: ModelStreamSource,
  name: string | undefined,
  config: ConfigResponse,
  {
    screen,
    enabled = true,
    intervalMs = modelStreamTiming.displayIntervalMs,
  }: UseModelStreamOptions = {}
): UseModelStreamResult {
  // Arrays/particles are large, and some arrays (e.g. `name`) hold strings the server can't encode.
  const outputIds = useMemo(
    () => config.outputs.filter((output) => output.kind === 'scalar').map((output) => output.id),
    [config.outputs]
  );
  const pvNames = useMemo(() => harePvNames(config), [config]);

  const live = useLiveStream(
    name,
    { screen: screen || null, outputs: outputIds },
    { enabled: enabled && source === 'lume' }
  );
  const canopyAvailable = isCanopyConfigured();
  const hare = useHareStream(pvNames, {
    enabled: enabled && source === 'canopy' && canopyAvailable,
  });

  const liveSnapshot = useMemo(
    () => (live.frame ? snapshotFromLiveFrame(live.frame) : undefined),
    [live.frame]
  );
  // Until Hare sends the first value, there is nothing to show (not "every PV disconnected").
  const hareSnapshot = useMemo(
    () =>
      Object.values(hare.pvs).some((pv) => pv.value || pv.rejected)
        ? snapshotFromHare(config, hare.pvs)
        : undefined,
    [config, hare.pvs]
  );

  // Both streams connect regardless; only what's rendered is limited.
  const snapshot = useThrottledValue(source === 'lume' ? liveSnapshot : hareSnapshot, intervalMs);

  if (source === 'lume') {
    return {
      status: live.status,
      snapshot,
      error: live.error,
      errorMessage: live.errorMessage,
      backend: undefined,
      available: true,
      reconnect: live.reconnect,
    };
  }
  return {
    status: hare.status,
    snapshot,
    error: hare.error,
    errorMessage: hare.errorMessage,
    backend: hare.backend,
    available: canopyAvailable,
    reconnect: hare.reconnect,
  };
}
