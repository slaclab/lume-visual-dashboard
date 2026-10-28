import { describe, expect, it } from 'vitest';
import { hasEvaluateTargets, lumeKeys, lumeQueries, normalizeEvaluateRequest } from './queries';
import { createQueryClient } from './queryClient';
import { LumeApiError } from './client';

describe('lumeKeys', () => {
  it('nests per-model keys under the model key for targeted invalidation', () => {
    expect(lumeKeys.config('demo').slice(0, 3)).toEqual(lumeKeys.model('demo'));
    expect(lumeKeys.snapshot('demo').slice(0, 3)).toEqual(lumeKeys.model('demo'));
  });

  it('gives equivalent evaluate requests the same key', () => {
    const a = lumeKeys.evaluate('demo', { outputs: ['b', 'a', 'a'], inputs: { Q: 1 } });
    const b = lumeKeys.evaluate('demo', {
      inputs: { Q: 1 },
      outputs: ['a', 'b'],
      screen: null,
      max_particles: null,
    });
    expect(a).toEqual(b);
  });
});

describe('normalizeEvaluateRequest', () => {
  it('fills defaults and drops nulls', () => {
    expect(normalizeEvaluateRequest({ screen: 'OTR_B', max_particles: null })).toEqual({
      inputs: {},
      outputs: [],
      screen: 'OTR_B',
    });
  });
});

describe('hasEvaluateTargets', () => {
  it('requires outputs or a screen', () => {
    expect(hasEvaluateTargets({})).toBe(false);
    expect(hasEvaluateTargets({ outputs: ['x'] })).toBe(true);
    expect(hasEvaluateTargets({ screen: 'OTR_B' })).toBe(true);
  });
});

describe('lumeQueries', () => {
  it('skips fetching when the model name is missing', () => {
    expect(lumeQueries.config(undefined).queryFn).toBeTypeOf('symbol');
    expect(lumeQueries.config('demo').queryFn).toBeTypeOf('function');
  });

  it('skips evaluate without outputs or screen', () => {
    expect(lumeQueries.evaluate('demo', {}).queryFn).toBeTypeOf('symbol');
  });
});

describe('createQueryClient retry policy', () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (
    n: number,
    e: unknown
  ) => boolean;

  it('does not retry 4xx', () => {
    expect(retry(0, new LumeApiError(400, null, ''))).toBe(false);
  });

  it('retries 5xx and network errors a bounded number of times', () => {
    expect(retry(0, new LumeApiError(503, null, ''))).toBe(true);
    expect(retry(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(retry(2, new TypeError('Failed to fetch'))).toBe(false);
  });
});
