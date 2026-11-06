import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { hareQueries } from '../api/canopy/queries';
import { hareStream, IDLE_HARE_STREAM_STATE, normalizePvNames } from '../api/canopy/stream';
import type { HareConnectionState, HarePvState, HareStreamState } from '../api/canopy/types';

// Thin wrappers over `hareQueries`; use the factories directly for `select`, suspense, etc.

export interface UsePvOptions {
  /** Poll interval in ms; omit or `false` to fetch once. */
  refetchInterval?: number | false;
}

/** Current value of a PV from Canopy's Hare (REST, not the WebSocket stream). */
export function usePv(pv: string | undefined, { refetchInterval = false }: UsePvOptions = {}) {
  return useQuery({ ...hareQueries.value(pv), refetchInterval });
}

/** Display metadata for a PV: units, precision, limits, enum labels. */
export function usePvMeta(pv: string | undefined) {
  return useQuery(hareQueries.meta(pv));
}

export interface UseHareStreamOptions {
  /** Set `false` to release the PVs (e.g. while the view is hidden). Default `true`. */
  enabled?: boolean;
}

export type UseHareStreamResult = HareStreamState & {
  /** Connects again now, e.g. from a "Retry" button once `status` is `closed`. */
  reconnect: () => void;
};

const noop = () => {};

/**
 * Live values and metadata for several PVs from Hare's WebSocket. All components share one
 * socket and each PV is subscribed once. `idle` while `pvNames` is empty or `enabled` is false.
 */
export function useHareStream(
  pvNames: readonly string[],
  { enabled = true }: UseHareStreamOptions = {}
): UseHareStreamResult {
  const namesKey = JSON.stringify(normalizePvNames(pvNames));
  const handle = useMemo(() => {
    const names = JSON.parse(namesKey) as string[];
    return enabled && names.length > 0 ? hareStream(names) : undefined;
  }, [enabled, namesKey]);

  const subscribe = useCallback(
    (listener: () => void) => (handle ? handle.subscribe(listener) : noop),
    [handle]
  );
  const getSnapshot = useCallback(
    () => (handle ? handle.getSnapshot() : IDLE_HARE_STREAM_STATE),
    [handle]
  );
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const reconnect = useCallback(() => handle?.reconnect(), [handle]);

  return { ...state, reconnect };
}

export type UsePvStreamResult = HareConnectionState &
  HarePvState & {
    reconnect: () => void;
  };

const EMPTY_PV: HarePvState = { value: undefined, meta: undefined, rejected: undefined };

/** Live value and metadata of one PV from Hare's WebSocket. See `useHareStream`. */
export function usePvStream(
  pv: string | undefined,
  options: UseHareStreamOptions = {}
): UsePvStreamResult {
  const { pvs, ...connection } = useHareStream(pv ? [pv] : [], options);
  return { ...connection, ...((pv && pvs[pv]) || EMPTY_PV) };
}
