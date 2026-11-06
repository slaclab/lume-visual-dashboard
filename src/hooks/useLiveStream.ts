import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  hasLiveStreamTargets,
  IDLE_LIVE_STREAM_STATE,
  liveStream,
  normalizeLiveStreamRequest,
} from '../api/live';
import type { LiveStreamRequest, LiveStreamState } from '../api/types';

export interface UseLiveStreamOptions {
  /** Set `false` to disconnect (e.g. while the view is hidden). Default `true`. */
  enabled?: boolean;
}

export type UseLiveStreamResult = LiveStreamState & {
  /** Connects again now, e.g. from a "Retry" button once `status` is `closed`. */
  reconnect: () => void;
};

const noop = () => {};

/**
 * The latest frame of a model's live stream, evaluated at the machine's current inputs.
 * Components asking for the same model, screen and outputs share one connection. `idle` until
 * `name` and at least one of `outputs`/`screen` are set.
 */
export function useLiveStream(
  name: string | undefined,
  request: LiveStreamRequest,
  { enabled = true }: UseLiveStreamOptions = {}
): UseLiveStreamResult {
  const requestKey = JSON.stringify(normalizeLiveStreamRequest(request));
  const handle = useMemo(() => {
    const normalized = JSON.parse(requestKey) as LiveStreamRequest;
    return enabled && name && hasLiveStreamTargets(normalized)
      ? liveStream(name, normalized)
      : undefined;
  }, [enabled, name, requestKey]);

  const subscribe = useCallback(
    (listener: () => void) => (handle ? handle.subscribe(listener) : noop),
    [handle]
  );
  const getSnapshot = useCallback(
    () => (handle ? handle.getSnapshot() : IDLE_LIVE_STREAM_STATE),
    [handle]
  );
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const reconnect = useCallback(() => handle?.reconnect(), [handle]);

  return { ...state, reconnect };
}
