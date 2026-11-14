import { queryOptions, skipToken } from '@tanstack/react-query';
import { describePv, getPv } from './endpoints';

/** Hierarchical keys, so `invalidateQueries({ queryKey: hareKeys.pv(name) })` hits one PV. */
export const hareKeys = {
  all: ['canopy', 'hare'] as const,
  pvs: () => [...hareKeys.all, 'pvs'] as const,
  pv: (pv: string | undefined) => [...hareKeys.pvs(), pv] as const,
  value: (pv: string | undefined) => [...hareKeys.pv(pv), 'value'] as const,
  meta: (pv: string | undefined) => [...hareKeys.pv(pv), 'meta'] as const,
};

const MINUTE = 60_000;

/** Reusable Hare query definitions; disabled (`skipToken`) until `pv` is non-empty. */
export const hareQueries = {
  value: (pv: string | undefined) =>
    queryOptions({
      queryKey: hareKeys.value(pv),
      queryFn: pv ? ({ signal }) => getPv(pv, signal) : skipToken,
      staleTime: 0,
    }),

  meta: (pv: string | undefined) =>
    queryOptions({
      queryKey: hareKeys.meta(pv),
      queryFn: pv ? ({ signal }) => describePv(pv, signal) : skipToken,
      staleTime: 10 * MINUTE,
    }),
};
