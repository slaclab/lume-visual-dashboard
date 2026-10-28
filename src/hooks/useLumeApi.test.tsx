import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useEvaluate, useMachineSnapshot, useModelConfig, useModels } from './useLumeApi';
import type { ConfigResponse, EvaluateRequest, EvaluateV1WireResponse } from '../api/types';
import { server, TEST_BASE_URL } from '../test/server';
import { createWrapper, encodeFloat32 } from '../test/utils';

const api = (path: string) => `${TEST_BASE_URL}/api/v1${path}`;

const config: ConfigResponse = {
  model: 'demo',
  version: '1',
  description: 'Demo model',
  inputs: [],
  outputs: [],
  screens: [{ key: 'OTR_B', particles: 'OTR_B_beam', image: null }],
};

function evaluateResponse(request: EvaluateRequest): EvaluateV1WireResponse {
  return {
    model: 'demo',
    version: '1',
    timestamp: 0,
    frame_index: 0,
    inputs: request.inputs ?? {},
    input_sources: {},
    outputs: {
      img: {
        kind: 'array',
        shape: [2],
        dtype: 'float32',
        data_b64: encodeFloat32([request.inputs?.Q ?? 0, 1]),
        unit: '',
        variable_class: 'ArrayVariable',
      },
    },
  };
}

describe('useModels', () => {
  it('loads the model list', async () => {
    server.use(
      http.get(api('/models'), () =>
        HttpResponse.json([{ name: 'demo', version: '1', description: '' }])
      )
    );
    const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((m) => m.name)).toEqual(['demo']);
  });
});

describe('useModelConfig', () => {
  it('is idle until a model name is given', () => {
    const { result } = renderHook(() => useModelConfig(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isPending).toBe(true);
  });

  it('loads and encodes the model name in the path', async () => {
    server.use(http.get(api('/models/demo%20x/config'), () => HttpResponse.json(config)));
    const { result } = renderHook(() => useModelConfig('demo x'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toEqual(config));
  });

  it('exposes API errors', async () => {
    server.use(
      http.get(api('/models/nope/config'), () =>
        HttpResponse.json({ detail: 'unknown model' }, { status: 404 })
      )
    );
    const { result } = renderHook(() => useModelConfig('nope'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('404: unknown model');
  });
});

describe('useMachineSnapshot', () => {
  it('loads the snapshot', async () => {
    const snapshot = { inputs: { Q: 1 }, sources: { Q: 'live' } };
    server.use(http.get(api('/models/demo/machine-snapshot'), () => HttpResponse.json(snapshot)));
    const { result } = renderHook(() => useMachineSnapshot('demo'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toEqual(snapshot));
  });
});

describe('useEvaluate', () => {
  it('does not call the API without outputs or a screen', () => {
    const { result } = renderHook(() => useEvaluate('demo', {}, { debounceMs: 0 }), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('posts the normalized request and returns decoded outputs', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(api('/models/demo/evaluate'), async ({ request }) => {
        const body = (await request.json()) as EvaluateRequest;
        bodies.push(body);
        return HttpResponse.json(evaluateResponse(body));
      })
    );
    const { result } = renderHook(
      () => useEvaluate('demo', { outputs: ['img'], inputs: { Q: 3 } }, { debounceMs: 0 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const img = result.current.data!.outputs.img;
    expect(img.kind === 'array' && Array.from(img.data)).toEqual([3, 1]);
    expect(bodies).toEqual([{ inputs: { Q: 3 }, outputs: ['img'] }]);
  });

  it('debounces rapid changes and keeps the previous result while loading', async () => {
    const seen: number[] = [];
    server.use(
      http.post(api('/models/demo/evaluate'), async ({ request }) => {
        const body = (await request.json()) as EvaluateRequest;
        seen.push(body.inputs!.Q);
        return HttpResponse.json(evaluateResponse(body));
      })
    );

    const { result, rerender } = renderHook(
      ({ q }) => useEvaluate('demo', { outputs: ['img'], inputs: { Q: q } }, { debounceMs: 50 }),
      { wrapper: createWrapper(), initialProps: { q: 1 } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => rerender({ q: 2 }));
    act(() => rerender({ q: 3 }));
    act(() => rerender({ q: 4 }));
    // Previous data stays visible while the debounced request is pending.
    expect(result.current.data?.inputs.Q).toBe(1);

    await waitFor(() => expect(result.current.data?.inputs.Q).toBe(4));
    expect(result.current.isPlaceholderData).toBe(false);
    expect(seen).toEqual([1, 4]);
  });

  it('does not refetch when re-rendered with an equivalent new object', async () => {
    let calls = 0;
    server.use(
      http.post(api('/models/demo/evaluate'), async ({ request }) => {
        calls++;
        return HttpResponse.json(evaluateResponse((await request.json()) as EvaluateRequest));
      })
    );
    const { result, rerender } = renderHook(
      () => useEvaluate('demo', { outputs: ['img'], inputs: { Q: 1 } }, { debounceMs: 20 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    rerender();
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toBe(1);
  });
});
