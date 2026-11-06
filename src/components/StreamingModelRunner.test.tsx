import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse, ws } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeAllHareStreams, hareStreamTiming } from '../api/canopy/stream';
import type { HareClientMessage, PVValue } from '../api/canopy/types';
import { closeAllLiveStreams, liveStreamTiming } from '../api/live';
import type { ConfigResponse } from '../api/types';
import { server, TEST_BASE_URL } from '../test/server';
import { createSseStream, liveFrame } from '../test/utils';
import StreamingModelRunner from './StreamingModelRunner';

const STREAM_URL = `${TEST_BASE_URL}/api/v1/models/demo/live/stream`;

const config: ConfigResponse = {
  model: 'demo',
  version: '1',
  description: 'Demo model',
  inputs: [
    {
      id: 'Q',
      unit: 'kG',
      default: 0,
      min: -1,
      max: 1,
      range_source: 'config',
      constant: false,
    },
  ],
  outputs: [{ id: 's', kind: 'scalar', unit: 'm', variable_class: 'ScalarVariable' }],
  screens: [{ key: 'OTR_B', particles: 'OTR_B_particles', image: null }],
};

function serveStreams() {
  const streams: ReturnType<typeof createSseStream>[] = [];
  const requests: Request[] = [];
  server.use(
    http.get(STREAM_URL, ({ request }) => {
      const sse = createSseStream();
      streams.push(sse);
      requests.push(request);
      return new HttpResponse(sse.stream, { headers: { 'Content-Type': 'text/event-stream' } });
    })
  );
  return { streams, requests };
}

/** The text of the row whose first cell is `id`, in the table labelled `table`. */
function rowText(table: string, id: string) {
  const cell = within(screen.getByRole('table', { name: table })).getByText(id);
  return cell.closest('tr')?.textContent;
}

const defaultTiming = { ...liveStreamTiming };
const defaultHareTiming = { ...hareStreamTiming };
beforeEach(() => {
  Object.assign(liveStreamTiming, { initialRetryMs: 10, maxRetryMs: 40, teardownMs: 20 });
  Object.assign(hareStreamTiming, {
    initialRetryMs: 10,
    maxRetryMs: 40,
    teardownMs: 20,
    staleAfterMs: 10_000,
  });
});
afterEach(() => {
  closeAllLiveStreams();
  closeAllHareStreams();
  Object.assign(liveStreamTiming, defaultTiming);
  Object.assign(hareStreamTiming, defaultHareTiming);
});

describe('StreamingModelRunner (lume-model-api)', () => {
  it('streams the selected screen and shows the latest inputs and outputs', async () => {
    const { streams, requests } = serveStreams();
    render(<StreamingModelRunner name="demo" config={config} source="lume" />);
    expect(screen.getByText('Connecting')).toBeTruthy();
    expect(screen.getByText('Waiting for the first values…')).toBeTruthy();

    await screen.findByText('Live');
    const url = new URL(requests[0].url);
    expect(url.searchParams.get('screen')).toBe('OTR_B');
    expect(url.searchParams.getAll('outputs')).toEqual(['s']);

    streams[0].sendEvent('frame', liveFrame(4, 1.5));
    await screen.findByText(/^Frame #4/);
    expect(rowText('Live inputs', 'Q')).toBe('Q1.5kGlive');
    expect(rowText('Outputs', 's')).toBe('sscalar1.5m');
  });

  it('keeps the last frame while paused, and reconnects on resume', async () => {
    const { streams, requests } = serveStreams();
    render(<StreamingModelRunner name="demo" config={config} source="lume" />);
    await screen.findByText('Live');
    streams[0].sendEvent('frame', liveFrame(4, 1.5));
    await screen.findByText(/^Frame #4/);

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('Paused')).toBeTruthy();
    await waitFor(() => expect(requests[0].signal.aborted).toBe(true));
    expect(screen.getByText(/^Frame #4/)).toBeTruthy();
    expect(rowText('Live inputs', 'Q')).toBe('Q1.5kGlive');

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(requests).toHaveLength(2));
    await screen.findByText('Live');
    streams[1].sendEvent('frame', liveFrame(9, 2));
    await screen.findByText(/^Frame #9/);
  });

  it('shows a closed stream with its error, and Retry connects again', async () => {
    let calls = 0;
    server.use(
      http.get(STREAM_URL, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ detail: 'Unknown screen key: OTR_B' }, { status: 400 });
        }
        const sse = createSseStream();
        sse.sendEvent('frame', liveFrame(1));
        return new HttpResponse(sse.stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );
    render(<StreamingModelRunner name="demo" config={config} source="lume" />);

    await screen.findByText('Closed');
    expect(screen.getByText('Live stream closed')).toBeTruthy();
    expect(screen.getByText('400: Unknown screen key: OTR_B')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText(/^Frame #1/);
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});

const hare = ws.link('ws://canopy.test/hare/v1/ws/pvs');

type HareClient = Parameters<
  Parameters<typeof hare.addEventListener<'connection'>>[1]
>[0]['client'];

/** Accepts every Hare connection and records the frames the client sends. */
function serveHare() {
  const clients: HareClient[] = [];
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

const sendHare = (client: HareClient, message: unknown) => client.send(JSON.stringify(message));

const namesSent = (frames: HareClientMessage[], type: 'subscribe' | 'unsubscribe') =>
  frames.flatMap((frame) => ('pvNames' in frame && frame.type === type ? frame.pvNames : []));

const pvValue = (pv: string, value: number): PVValue => ({
  pv,
  value,
  valueKind: 'scalar',
  severity: 'NO_ALARM',
  alarmStatus: 0,
  tsNs: 1_700_000_000_000_000_000,
  connected: true,
  error: null,
});

describe('StreamingModelRunner (Canopy Hare)', () => {
  it('subscribes the input and scalar output PVs and shows their measured values', async () => {
    // Any lume-model-api request would fail the test: MSW errors on unhandled requests.
    const { clients, received } = serveHare();
    render(<StreamingModelRunner name="demo" config={config} source="canopy" />);
    expect(screen.getByRole('heading', { name: 'Live PVs (Canopy Hare)' })).toBeTruthy();
    // Screens are model-evaluated, so there is no screen select.
    expect(screen.queryByRole('combobox', { name: 'Screen' })).toBeNull();

    await screen.findByText('Live');
    await waitFor(() => expect(namesSent(received[0], 'subscribe')).toEqual(['Q', 's']));
    expect(screen.getByText('Waiting for the first values…')).toBeTruthy();

    sendHare(clients[0], {
      type: 'initial',
      data: { Q: pvValue('Q', 0.25), s: pvValue('s', 3) },
      meta: {},
      count: 2,
    });
    await waitFor(() => expect(rowText('Live inputs', 'Q')).toBe('Q0.25kGlive'));
    expect(rowText('Outputs', 's')).toBe('sscalar3m');

    sendHare(clients[0], { type: 'diff', data: { s: pvValue('s', 4) }, count: 1, timestamp: 1 });
    await waitFor(() => expect(rowText('Outputs', 's')).toBe('sscalar4m'));

    sendHare(clients[0], { type: 'heartbeat', timestamp: 1, backend: 'simulation' });
    await screen.findByText('Backend: simulation');
  });

  it('shows rejected PVs without a value', async () => {
    const { clients } = serveHare();
    render(<StreamingModelRunner name="demo" config={config} source="canopy" />);
    await screen.findByText('Live');

    sendHare(clients[0], {
      type: 'error',
      code: 'invalid_pv_name',
      message: 'Invalid PV name',
      pvNames: ['Q'],
    });
    await waitFor(() => expect(rowText('Live inputs', 'Q')).toBe('Q—kGrejected'));
    expect(rowText('Outputs', 's')).toBe('sscalar—m');
  });

  it('keeps the last values while paused, and resubscribes on resume', async () => {
    const { clients, received } = serveHare();
    render(<StreamingModelRunner name="demo" config={config} source="canopy" />);
    await screen.findByText('Live');
    sendHare(clients[0], {
      type: 'initial',
      data: { Q: pvValue('Q', 0.25), s: pvValue('s', 3) },
      meta: {},
      count: 2,
    });
    await waitFor(() => expect(rowText('Outputs', 's')).toBe('sscalar3m'));

    let closed = false;
    clients[0].addEventListener('close', () => (closed = true));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('Paused')).toBeTruthy();
    // Releasing the last PVs closes the shared socket.
    await waitFor(() => expect(closed).toBe(true));
    expect(rowText('Outputs', 's')).toBe('sscalar3m');

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await screen.findByText('Live');
    await waitFor(() => expect(clients).toHaveLength(2));
    await waitFor(() => expect(namesSent(received[1], 'subscribe')).toEqual(['Q', 's']));
  });
});
