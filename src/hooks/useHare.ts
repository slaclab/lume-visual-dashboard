import { useQuery } from '@tanstack/react-query';
import { hareQueries } from '../api/canopy/queries';

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
