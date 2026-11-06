import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, ws } from 'msw';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useHareStream, usePv, usePvMeta, usePvStream } from './useHare';
import { closeAllHareStreams, hareStreamTiming } from '../api/canopy/stream';
import type { PVMeta, PVValue } from '../api/canopy/types';
import { CANOPY_TEST_API_KEY, CANOPY_TEST_BASE_URL, server } from '../test/server';
import { createWrapper } from '../test/utils';

const pvUrl = `${CANOPY_TEST_BASE_URL}/hare/v1/pvs/:pv`;

const pvValue = (pv: string, value: number): PVValue => ({
  pv,
  value,
  valueKind: 'scalar',
  severity: 'NO_ALARM',
  alarmStatus: 0,
  tsNs: 0,
  connected: true,
  error: null,
});

describe('usePv', () => {
  it('is idle until a PV name is given', () => {
    const { result } = renderHook(() => usePv(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('loads the PV value with the API key', async () => {
    server.use(
      http.get(pvUrl, ({ request, params }) => {
        expect(request.headers.get('x-api-key')).toBe(CANOPY_TEST_API_KEY);
        return HttpResponse.json(pvValue(params.pv as string, 3.2));
      })
    );
    const { result } = renderHook(() => usePv('TEST:SINE'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ pv: 'TEST:SINE', value: 3.2 });
  });

  it('polls when refetchInterval is set', async () => {
    let calls = 0;
    server.use(
      http.get(pvUrl, ({ params }) => HttpResponse.json(pvValue(params.pv as string, ++calls)))
    );
    const { result } = renderHook(() => usePv('TEST:SINE', { refetchInterval: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data?.value).toBeGreaterThanOrEqual(3));
  });

  it('exposes Canopy errors', async () => {
    server.use(
      http.get(pvUrl, () =>
        HttpResponse.json({ code: 'invalid_api_key', detail: 'Unknown API key' }, { status: 401 })
      )
    );
    const { result } = renderHook(() => usePv('TEST:SINE'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('401: Unknown API key');
  });
});

describe('usePvMeta', () => {
  it('loads PV metadata', async () => {
    const meta: PVMeta = {
      pv: 'TEST:ENUM',
      valueKind: 'enum',
      enumChoices: ['OFF', 'ON'],
    };
    server.use(http.get(`${pvUrl}/describe`, () => HttpResponse.json(meta)));
    const { result } = renderHook(() => usePvMeta('TEST:ENUM'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.enumChoices).toEqual(['OFF', 'ON']);
  });
});

const hare = ws.link('ws://canopy.test/hare/v1/ws/pvs');
type Client = Parameters<Parameters<typeof hare.addEventListener<'connection'>>[1]>[0]['client'];

function serveHare() {
  const clients: Client[] = [];
  const subscribed: string[][] = [];
  server.use(
    hare.addEventListener('connection', ({ client }) => {
      clients.push(client);
      client.addEventListener('message', (event) => {
        const frame = JSON.parse(String(event.data));
        if (frame.type === 'subscribe') subscribed.push(frame.pvNames);
      });
    })
  );
  return { clients, subscribed };
}

describe('Hare stream hooks', () => {
  const defaultTiming = { ...hareStreamTiming };
  beforeEach(() => {
    Object.assign(hareStreamTiming, { initialRetryMs: 10, maxRetryMs: 40, teardownMs: 20 });
  });
  afterEach(() => {
    closeAllHareStreams();
    Object.assign(hareStreamTiming, defaultTiming);
  });

  it.each([
    ['no PVs', [] as string[], true],
    ['disabled', ['X:1'], false],
  ])('useHareStream is idle and opens no socket with %s', async (_, names, enabled) => {
    // Any connection would fail the test: MSW is set to error on unhandled requests.
    const { result } = renderHook(() => useHareStream(names, { enabled }));
    expect(result.current.status).toBe('idle');
    expect(result.current.pvs).toEqual({});
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  it('usePvStream shows the live value and metadata of one PV', async () => {
    const { clients } = serveHare();
    const { result } = renderHook(() => usePvStream('TEST:SINE'));
    expect(result.current).toMatchObject({ status: 'connecting', value: undefined });
    await waitFor(() => expect(result.current.status).toBe('open'));

    act(() =>
      clients[0].send(
        JSON.stringify({
          type: 'initial',
          data: { 'TEST:SINE': pvValue('TEST:SINE', 1) },
          meta: { 'TEST:SINE': { pv: 'TEST:SINE', valueKind: 'scalar', units: 'degC' } },
          count: 1,
        })
      )
    );
    await waitFor(() => expect(result.current.value?.value).toBe(1));
    expect(result.current.meta?.units).toBe('degC');

    act(() =>
      clients[0].send(
        JSON.stringify({
          type: 'diff',
          data: { 'TEST:SINE': pvValue('TEST:SINE', 2) },
          count: 1,
          timestamp: 1,
        })
      )
    );
    await waitFor(() => expect(result.current.value?.value).toBe(2));
  });

  it('components share one socket and one subscribe, through a StrictMode remount', async () => {
    const { clients, subscribed } = serveHare();
    const { result } = renderHook(
      () => ({
        many: useHareStream(['X:1', 'X:2']),
        one: usePvStream('X:2'),
      }),
      { wrapper: StrictMode }
    );
    await waitFor(() => expect(result.current.one.status).toBe('open'));
    await waitFor(() => expect(subscribed).toEqual([['X:1', 'X:2']]));
    expect(clients).toHaveLength(1);

    act(() =>
      clients[0].send(
        JSON.stringify({ type: 'diff', data: { 'X:2': pvValue('X:2', 5) }, count: 1, timestamp: 1 })
      )
    );
    await waitFor(() => expect(result.current.one.value?.value).toBe(5));
    expect(result.current.many.pvs['X:2'].value?.value).toBe(5);
    expect(Object.keys(result.current.many.pvs)).toEqual(['X:1', 'X:2']);
  });

  it('subscribes added PVs and unsubscribes removed ones when the list changes', async () => {
    const { clients } = serveHare();
    const frames: { type: string; pvNames: string[] }[] = [];
    const { result, rerender } = renderHook(({ names }) => useHareStream(names), {
      initialProps: { names: ['X:1', 'X:2'] },
    });
    await waitFor(() => expect(result.current.status).toBe('open'));
    clients[0].addEventListener('message', (event) => frames.push(JSON.parse(String(event.data))));

    rerender({ names: ['X:2', 'X:3'] });
    await waitFor(() =>
      expect(frames).toEqual([
        { type: 'subscribe', pvNames: ['X:3'] },
        { type: 'unsubscribe', pvNames: ['X:1'] },
      ])
    );
    expect(Object.keys(result.current.pvs)).toEqual(['X:2', 'X:3']);
  });
});
