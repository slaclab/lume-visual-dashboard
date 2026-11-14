import { http, HttpResponse, ws } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LumeApiError } from '../client';
import {
  closeAllHareStreams,
  hareStream,
  hareStreamTiming,
  hareWebSocketUrl,
  normalizePvNames,
} from './stream';
import type { HareClientMessage, PVMeta, PVValue } from './types';
import { CANOPY_TEST_API_KEY, CANOPY_TEST_BASE_URL, server } from '../../test/server';

const WS_URL = 'ws://canopy.test/hare/v1/ws/pvs';
const hare = ws.link(WS_URL);

type Client = Parameters<Parameters<typeof hare.addEventListener<'connection'>>[1]>[0]['client'];

/** Accepts every connection and records it and the frames the client sends. */
function serveHare() {
  const clients: Client[] = [];
  const received: HareClientMessage[][] = [];
  server.use(
    hare.addEventListener('connection', ({ client }) => {
      const frames: HareClientMessage[] = [];
      clients.push(client);
      received.push(frames);
      client.addEventListener('message', (event) => {
        frames.push(JSON.parse(String(event.data)) as HareClientMessage);
      });
    })
  );
  return { clients, received };
}

const send = (client: Client, message: unknown) => client.send(JSON.stringify(message));

const pvValue = (pv: string, value: number): PVValue => ({
  pv,
  value,
  valueKind: 'scalar',
  severity: 'NO_ALARM',
  alarmStatus: 0,
  tsNs: 1_700_000_000_000,
  connected: true,
  error: null,
});

const pvMeta = (pv: string): PVMeta =>
  ({ pv, valueKind: 'scalar', units: 'mm', precision: 2 }) as PVMeta;

const subscribedNames = (frames: HareClientMessage[], type = 'subscribe') =>
  frames.flatMap((frame) => ('pvNames' in frame && frame.type === type ? frame.pvNames : []));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultTiming = { ...hareStreamTiming };
beforeEach(() => {
  Object.assign(hareStreamTiming, {
    initialRetryMs: 10,
    maxRetryMs: 40,
    teardownMs: 20,
    staleAfterMs: 10_000,
  });
});
afterEach(() => {
  closeAllHareStreams();
  Object.assign(hareStreamTiming, defaultTiming);
});

describe('hare stream helpers', () => {
  it('builds ws/wss URLs with the API key in the query string', () => {
    expect(hareWebSocketUrl()).toBe(`${WS_URL}?api_key=${CANOPY_TEST_API_KEY}`);
    expect(hareWebSocketUrl('https://host/canopy', 'a b')).toBe(
      'wss://host/canopy/hare/v1/ws/pvs?api_key=a+b'
    );
  });

  it('drops empty and duplicate names, keeping order', () => {
    expect(normalizePvNames(['B', '', 'A', 'B'])).toEqual(['B', 'A']);
  });
});

describe('hareStream', () => {
  it('shares one socket and sends one subscribe for PVs acquired together', async () => {
    const { clients, received } = serveHare();
    const a = hareStream(['X:1', 'X:2']);
    const b = hareStream(['X:2', 'X:3']);
    a.subscribe(() => {});
    b.subscribe(() => {});
    expect(a.getSnapshot().status).toBe('connecting');

    await expect.poll(() => a.getSnapshot().status).toBe('open');
    await expect.poll(() => subscribedNames(received[0])).toEqual(['X:1', 'X:2', 'X:3']);
    expect(clients).toHaveLength(1);
    expect(new URL(clients[0].url).searchParams.get('api_key')).toBe(CANOPY_TEST_API_KEY);
    expect(received[0]).toHaveLength(1);
  });

  it('merges initial values and metadata, then applies diffs', async () => {
    const { clients } = serveHare();
    const handle = hareStream(['X:1', 'X:2']);
    handle.subscribe(() => {});
    await expect.poll(() => clients.length).toBe(1);

    send(clients[0], {
      type: 'initial',
      data: { 'X:1': pvValue('X:1', 1) },
      meta: { 'X:1': pvMeta('X:1') },
      count: 1,
    });
    // A later `initial` for another PV must not wipe the first one's metadata.
    send(clients[0], { type: 'initial', data: { 'X:2': pvValue('X:2', 2) }, meta: {}, count: 1 });
    send(clients[0], {
      type: 'diff',
      data: { 'X:1': pvValue('X:1', 1.5) },
      count: 1,
      timestamp: 1,
    });

    await expect.poll(() => handle.getSnapshot().pvs['X:1'].value?.value).toBe(1.5);
    const { pvs } = handle.getSnapshot();
    expect(pvs['X:1'].meta?.units).toBe('mm');
    expect(pvs['X:2'].value?.value).toBe(2);
    expect(pvs['X:2'].meta).toBeUndefined();
  });

  it("keeps a handle's snapshot stable when only other PVs change", async () => {
    const { clients } = serveHare();
    const a = hareStream(['X:1']);
    const b = hareStream(['X:2']);
    a.subscribe(() => {});
    b.subscribe(() => {});
    await expect.poll(() => a.getSnapshot().status).toBe('open');

    const before = a.getSnapshot();
    send(clients[0], { type: 'diff', data: { 'X:2': pvValue('X:2', 9) }, count: 1, timestamp: 1 });
    await expect.poll(() => b.getSnapshot().pvs['X:2'].value?.value).toBe(9);
    expect(a.getSnapshot()).toBe(before);
  });

  it('reports the backend, rejected names and connection-level errors', async () => {
    const { clients } = serveHare();
    const handle = hareStream(['X:1', 'BAD NAME']);
    handle.subscribe(() => {});
    await expect.poll(() => clients.length).toBe(1);

    send(clients[0], { type: 'heartbeat', timestamp: 1, backend: 'simulation' });
    send(clients[0], {
      type: 'error',
      code: 'invalid_pv_name',
      message: 'rejected 1 invalid PV name(s)',
      pvNames: ['BAD NAME'],
    });
    send(clients[0], { type: 'error', code: 'invalid_message', message: 'bad frame' });

    await expect.poll(() => handle.getSnapshot().errorMessage).toBe('bad frame');
    const state = handle.getSnapshot();
    expect(state.backend).toBe('simulation');
    expect(state.pvs['BAD NAME'].rejected).toBe('rejected 1 invalid PV name(s)');
    expect(state.pvs['X:1'].rejected).toBeUndefined();
  });

  it('unsubscribes released PVs after the teardown delay, unless re-acquired', async () => {
    const { received } = serveHare();
    const a = hareStream(['X:1', 'X:2']);
    const b = hareStream(['X:2']);
    const releaseA = a.subscribe(() => {});
    b.subscribe(() => {});
    await expect.poll(() => subscribedNames(received[0])).toEqual(['X:1', 'X:2']);

    // A remount within the delay keeps the subscription without any traffic.
    releaseA();
    const releaseAgain = a.subscribe(() => {});
    await sleep(40);
    expect(received[0]).toHaveLength(1);

    releaseAgain();
    await expect.poll(() => subscribedNames(received[0], 'unsubscribe')).toEqual(['X:1']);
    expect(b.getSnapshot().status).toBe('open');
  });

  it('closes the socket once the last PV is released', async () => {
    const { clients } = serveHare();
    let closed = false;
    const handle = hareStream(['X:1']);
    const release = handle.subscribe(() => {});
    await expect.poll(() => clients.length).toBe(1);
    clients[0].addEventListener('close', () => (closed = true));

    release();
    await expect.poll(() => closed).toBe(true);
  });

  it('reconnects after a drop, re-subscribing every PV and keeping values meanwhile', async () => {
    const { clients, received } = serveHare();
    const handle = hareStream(['X:1', 'X:2']);
    const statuses: string[] = [];
    handle.subscribe(() => statuses.push(handle.getSnapshot().status));
    await expect.poll(() => handle.getSnapshot().status).toBe('open');
    send(clients[0], { type: 'diff', data: { 'X:1': pvValue('X:1', 1) }, count: 1, timestamp: 1 });
    await expect.poll(() => handle.getSnapshot().pvs['X:1'].value?.value).toBe(1);

    server.use(
      http.get(`${CANOPY_TEST_BASE_URL}/hare/v1/health/summary`, () => HttpResponse.json({}))
    );
    clients[0].close(1011, 'server restarting');

    await expect.poll(() => subscribedNames(received[1] ?? [])).toEqual(['X:1', 'X:2']);
    expect(statuses).toContain('reconnecting');
    expect(handle.getSnapshot().pvs['X:1'].value?.value).toBe(1);
    await expect
      .poll(() => handle.getSnapshot())
      .toMatchObject({ status: 'open', error: undefined });
  });

  it('stops for good when the API key is refused, until reconnect()', async () => {
    let connections = 0;
    server.use(
      hare.addEventListener('connection', ({ client }) => {
        connections += 1;
        if (connections === 1) client.close(1008, 'invalid_api_key');
      }),
      http.get(`${CANOPY_TEST_BASE_URL}/hare/v1/health/summary`, ({ request }) => {
        expect(request.headers.get('x-api-key')).toBe(CANOPY_TEST_API_KEY);
        return connections === 1
          ? HttpResponse.json(
              { code: 'invalid_api_key', detail: 'Invalid API key' },
              { status: 401 }
            )
          : HttpResponse.json({});
      })
    );
    const handle = hareStream(['X:1']);
    handle.subscribe(() => {});

    await expect.poll(() => handle.getSnapshot().status).toBe('closed');
    const { error } = handle.getSnapshot();
    expect(error).toBeInstanceOf(LumeApiError);
    expect(error?.message).toBe('401: Invalid API key');
    await sleep(50);
    expect(connections).toBe(1);

    handle.reconnect();
    await expect.poll(() => handle.getSnapshot().status).toBe('open');
    expect(connections).toBe(2);
  });

  it('keeps retrying when the handshake fails but the key is valid', async () => {
    let connections = 0;
    server.use(
      hare.addEventListener('connection', ({ client }) => {
        connections += 1;
        if (connections === 1) client.close(1008, 'policy');
      }),
      http.get(`${CANOPY_TEST_BASE_URL}/hare/v1/health/summary`, () => HttpResponse.json({}))
    );
    const handle = hareStream(['X:1']);
    handle.subscribe(() => {});
    await expect.poll(() => connections).toBe(2);
    await expect.poll(() => handle.getSnapshot().status).toBe('open');
  });

  it('reconnects when Hare goes silent past the heartbeat window', async () => {
    hareStreamTiming.staleAfterMs = 30;
    const { clients } = serveHare();
    const handle = hareStream(['X:1']);
    const errors: string[] = [];
    handle.subscribe(() => {
      const { error } = handle.getSnapshot();
      if (error) errors.push(error.message);
    });
    await expect.poll(() => clients.length).toBeGreaterThanOrEqual(2);
    expect(errors.some((message) => message.includes('no message from Hare'))).toBe(true);
  });

  it('splits large subscriptions into several frames', async () => {
    const { received } = serveHare();
    const names = Array.from({ length: 2500 }, (_, i) => `X:${i}`);
    hareStream(names).subscribe(() => {});
    await expect.poll(() => received[0]?.length).toBe(3);
    expect(subscribedNames(received[0])).toEqual(names);
  });
});
