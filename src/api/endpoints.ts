import { fetchJson } from './client';
import { decodeEvaluateResponse } from './decode';
import type {
  ConfigResponse,
  EvaluateRequest,
  EvaluateResponse,
  EvaluateV1WireResponse,
  ModelListEntry,
  SnapshotResponse,
} from './types';

const modelPath = (name: string) => `/api/v1/models/${encodeURIComponent(name)}`;

export function getModels(signal?: AbortSignal): Promise<ModelListEntry[]> {
  return fetchJson('/api/v1/models', { signal });
}

export function getModelConfig(name: string, signal?: AbortSignal): Promise<ConfigResponse> {
  return fetchJson(`${modelPath(name)}/config`, { signal });
}

export function getMachineSnapshot(name: string, signal?: AbortSignal): Promise<SnapshotResponse> {
  return fetchJson(`${modelPath(name)}/machine-snapshot`, { signal });
}

export async function evaluateModel(
  name: string,
  request: EvaluateRequest,
  signal?: AbortSignal
): Promise<EvaluateResponse> {
  const wire = await fetchJson<EvaluateV1WireResponse>(`${modelPath(name)}/evaluate`, {
    method: 'POST',
    body: request,
    signal,
  });
  return decodeEvaluateResponse(wire);
}
