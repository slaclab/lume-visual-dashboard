import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { lumeQueries, normalizeEvaluateRequest } from '../api/queries';
import type { EvaluateRequest } from '../api/types';
import { useDebouncedValue } from './useDebouncedValue';

// Thin wrappers over `lumeQueries`. For `select`, suspense or other options, use the
// factories directly: `useQuery({ ...lumeQueries.config(name), select: (c) => c.screens })`.

export function useModels() {
  return useQuery(lumeQueries.models());
}

export function useModelConfig(name: string | undefined) {
  return useQuery(lumeQueries.config(name));
}

export interface UseMachineSnapshotOptions {
  /** Poll interval in ms; omit or `false` to fetch once. */
  refetchInterval?: number | false;
}

export function useMachineSnapshot(
  name: string | undefined,
  { refetchInterval = false }: UseMachineSnapshotOptions = {}
) {
  return useQuery({ ...lumeQueries.machineSnapshot(name), refetchInterval });
}

export interface UseEvaluateOptions {
  /** Wait for the request to stop changing (e.g. while dragging a slider). Default 150 ms. */
  debounceMs?: number;
}

/**
 * Evaluate a model. Keeps showing the previous result while a new one loads
 * (`isPlaceholderData` is true during that time). Disabled until `name` and at least
 * one of `outputs`/`screen` are set.
 */
export function useEvaluate(
  name: string | undefined,
  request: EvaluateRequest,
  { debounceMs = 150 }: UseEvaluateOptions = {}
) {
  const requestKey = JSON.stringify(normalizeEvaluateRequest(request));
  const debouncedKey = useDebouncedValue(requestKey, debounceMs);
  const debouncedRequest = useMemo(
    () => JSON.parse(debouncedKey) as EvaluateRequest,
    [debouncedKey]
  );
  return useQuery({
    ...lumeQueries.evaluate(name, debouncedRequest),
    placeholderData: keepPreviousData,
  });
}
