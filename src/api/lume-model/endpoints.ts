import { lumeFetch } from '@api/lume-model/client';
import { decodeEvaluateResponse } from '@api/lume-model/decode';
import type {
  ConfigResponse,
  EvaluateRequest,
  EvaluateResponse,
  EvaluateV1WireResponse,
  ModelListEntry,
  SnapshotResponse,
} from '@api/lume-model/types';

export const modelPath = (name: string) => `/api/v1/models/${encodeURIComponent(name)}`;

export function getModels(signal?: AbortSignal): Promise<ModelListEntry[]> {
  return lumeFetch('/api/v1/models', { signal });
}

export function getModelConfig(name: string, signal?: AbortSignal): Promise<ConfigResponse> {
  return lumeFetch(`${modelPath(name)}/config`, { signal });
}

export function getMachineSnapshot(name: string, signal?: AbortSignal): Promise<SnapshotResponse> {
  return lumeFetch(`${modelPath(name)}/machine-snapshot`, { signal });
}

export async function evaluateModel(
  name: string,
  request: EvaluateRequest,
  signal?: AbortSignal
): Promise<EvaluateResponse> {
  const wire = await lumeFetch<EvaluateV1WireResponse>(`${modelPath(name)}/evaluate`, {
    method: 'POST',
    body: request,
    signal,
  });
  return decodeEvaluateResponse(wire);
}
