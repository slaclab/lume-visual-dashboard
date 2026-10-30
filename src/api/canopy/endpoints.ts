import { canopyFetch } from './client';
import type { PVMeta, PVValue } from './types';

// Encoded so `pva://` prefixes and other reserved characters stay in one path segment.
const pvPath = (pv: string) => `/hare/v1/pvs/${encodeURIComponent(pv)}`;

export function getPv(pv: string, signal?: AbortSignal): Promise<PVValue> {
  return canopyFetch(pvPath(pv), { signal });
}

export function describePv(pv: string, signal?: AbortSignal): Promise<PVMeta> {
  return canopyFetch(`${pvPath(pv)}/describe`, { signal });
}
