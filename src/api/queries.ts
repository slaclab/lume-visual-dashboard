import { queryOptions, skipToken } from '@tanstack/react-query';
import { evaluateModel, getMachineSnapshot, getModelConfig, getModels } from './endpoints';
import type { EvaluateRequest } from './types';

/**
 * Hierarchical query keys, so e.g. `invalidateQueries({ queryKey: lumeKeys.model(name) })`
 * hits everything cached for one model.
 */
export const lumeKeys = {
  all: ['lume'] as const,
  models: () => [...lumeKeys.all, 'models'] as const,
  model: (name: string | undefined) => [...lumeKeys.models(), name] as const,
  config: (name: string | undefined) => [...lumeKeys.model(name), 'config'] as const,
  snapshot: (name: string | undefined) => [...lumeKeys.model(name), 'machine-snapshot'] as const,
  evaluate: (name: string | undefined, request: EvaluateRequest) =>
    [...lumeKeys.model(name), 'evaluate', normalizeEvaluateRequest(request)] as const,
};

/** Equivalent requests (reordered/duplicate outputs, omitted defaults) share one cache entry. */
export function normalizeEvaluateRequest(request: EvaluateRequest): EvaluateRequest {
  const normalized: EvaluateRequest = {
    inputs: request.inputs ?? {},
    outputs: [...new Set(request.outputs ?? [])].sort(),
  };
  if (request.screen != null) normalized.screen = request.screen;
  if (request.max_particles != null) normalized.max_particles = request.max_particles;
  if (request.smooth_images_sigma_px != null) {
    normalized.smooth_images_sigma_px = request.smooth_images_sigma_px;
  }
  return normalized;
}

export function hasEvaluateTargets(request: EvaluateRequest): boolean {
  return (request.outputs?.length ?? 0) > 0 || !!request.screen;
}

const MINUTE = 60_000;

/**
 * Reusable query definitions. Use with `useQuery`, `useSuspenseQuery`, `useQueries`,
 * `queryClient.ensureQueryData` (e.g. in router loaders) or `prefetchQuery`.
 */
export const lumeQueries = {
  models: () =>
    queryOptions({
      queryKey: lumeKeys.models(),
      queryFn: ({ signal }) => getModels(signal),
      staleTime: 10 * MINUTE,
    }),

  config: (name: string | undefined) =>
    queryOptions({
      queryKey: lumeKeys.config(name),
      queryFn: name ? ({ signal }) => getModelConfig(name, signal) : skipToken,
      staleTime: 10 * MINUTE,
    }),

  machineSnapshot: (name: string | undefined) =>
    queryOptions({
      queryKey: lumeKeys.snapshot(name),
      queryFn: name ? ({ signal }) => getMachineSnapshot(name, signal) : skipToken,
      staleTime: 0,
    }),

  /**
   * Evaluate is a stateless POST (same request -> same result), so it is modelled as a query.
   * Responses can be several MB (images/particles), so unused entries are dropped quickly.
   */
  evaluate: (name: string | undefined, request: EvaluateRequest) => {
    const normalized = normalizeEvaluateRequest(request);
    return queryOptions({
      queryKey: lumeKeys.evaluate(name, normalized),
      queryFn:
        name && hasEvaluateTargets(normalized)
          ? ({ signal }) => evaluateModel(name, normalized, signal)
          : skipToken,
      staleTime: 5 * MINUTE,
      gcTime: MINUTE,
      structuralSharing: false,
    });
  },
};
