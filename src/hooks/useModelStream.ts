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
import { useLiveStream } from './useLiveStream';

export interface UseModelStreamOptions {
  /** lume only: the screen whose particles and image outputs to add. */
  screen?: string;
  /** Set `false` to disconnect. Default `true`. */
  enabled?: boolean;
}

export interface UseModelStreamResult {
  status: LiveStreamStatus;
  /** The latest values; `undefined` until the first frame (lume) or while idle. */
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
  { screen, enabled = true }: UseModelStreamOptions = {}
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

  if (source === 'lume') {
    return {
      status: live.status,
      snapshot: liveSnapshot,
      error: live.error,
      errorMessage: live.errorMessage,
      backend: undefined,
      available: true,
      reconnect: live.reconnect,
    };
  }
  return {
    status: hare.status,
    snapshot: hareSnapshot,
    error: hare.error,
    errorMessage: hare.errorMessage,
    backend: hare.backend,
    available: canopyAvailable,
    reconnect: hare.reconnect,
  };
}
