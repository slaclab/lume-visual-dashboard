import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { usePv, usePvMeta } from './useHare';
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
