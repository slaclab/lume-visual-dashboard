import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { canopyFetch, getCanopyApiKey, getCanopyBaseUrl } from './client';
import { describePv, getPv } from './endpoints';
import { hareKeys, hareQueries } from './queries';
import type { PVValue } from './types';
import { LumeApiError } from '../client';
import { CANOPY_TEST_API_KEY, CANOPY_TEST_BASE_URL, server } from '../../test/server';

const value: PVValue = {
  pv: 'pva://TEST:SINE',
  value: 1.5,
  valueKind: 'scalar',
  severity: 'NO_ALARM',
  alarmStatus: 0,
  tsNs: 1_700_000_000_000,
  connected: true,
  error: null,
};

describe('canopy client', () => {
  it('uses the configured base URL and API key', () => {
    expect(getCanopyBaseUrl()).toBe(CANOPY_TEST_BASE_URL);
    expect(getCanopyApiKey()).toBe(CANOPY_TEST_API_KEY);
  });

  it('sends X-API-Key and surfaces Canopy {code, detail} errors as LumeApiError', async () => {
    server.use(
      http.get(`${CANOPY_TEST_BASE_URL}/hare/v1/pvs/:pv`, ({ request }) => {
        expect(request.headers.get('x-api-key')).toBe(CANOPY_TEST_API_KEY);
        return HttpResponse.json(
          { code: 'insufficient_module_access', detail: 'Key not allowed for hare' },
          { status: 403 }
        );
      })
    );
    const error = await canopyFetch('/hare/v1/pvs/X').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LumeApiError);
    expect(error).toMatchObject({ status: 403, isClientError: true });
    expect((error as LumeApiError).message).toBe('403: Key not allowed for hare');
  });
});

describe('hare endpoints', () => {
  it('encodes PV names, keeping pva:// prefixes in one path segment', async () => {
    let requested = '';
    server.use(
      http.get(`${CANOPY_TEST_BASE_URL}/hare/v1/pvs/:pv`, ({ request, params }) => {
        requested = new URL(request.url).pathname;
        expect(params.pv).toBe('pva://TEST:SINE');
        return HttpResponse.json(value);
      })
    );
    await expect(getPv('pva://TEST:SINE')).resolves.toEqual(value);
    expect(requested).toBe('/hare/v1/pvs/pva%3A%2F%2FTEST%3ASINE');
  });

  it('describes a PV', async () => {
    server.use(
      http.get(`${CANOPY_TEST_BASE_URL}/hare/v1/pvs/:pv/describe`, ({ params }) =>
        HttpResponse.json({ pv: params.pv, valueKind: 'scalar', units: 'mm', precision: 2 })
      )
    );
    await expect(describePv('TEST:POS')).resolves.toMatchObject({ pv: 'TEST:POS', units: 'mm' });
  });
});

describe('hareKeys / hareQueries', () => {
  it('nests value and meta keys under the PV key', () => {
    expect(hareKeys.value('A').slice(0, 4)).toEqual(hareKeys.pv('A'));
    expect(hareKeys.meta('A').slice(0, 4)).toEqual(hareKeys.pv('A'));
    expect(hareKeys.value('A')).not.toEqual(hareKeys.meta('A'));
  });

  it('is disabled until a PV name is given', () => {
    expect(typeof hareQueries.value(undefined).queryFn).not.toBe('function');
    expect(typeof hareQueries.meta('').queryFn).not.toBe('function');
    expect(typeof hareQueries.value('A').queryFn).toBe('function');
  });
});
