import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
beforeEach(() => {
  Object.assign(liveStreamTiming, { initialRetryMs: 10, maxRetryMs: 40, teardownMs: 20 });
});
afterEach(() => {
  closeAllLiveStreams();
  Object.assign(liveStreamTiming, defaultTiming);
});

describe('StreamingModelRunner', () => {
  it('streams the selected screen and shows the latest inputs and outputs', async () => {
    const { streams, requests } = serveStreams();
    render(<StreamingModelRunner name="demo" config={config} />);
    expect(screen.getByText('Connecting')).toBeTruthy();
    expect(screen.getByText('Waiting for the first frame…')).toBeTruthy();

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
    render(<StreamingModelRunner name="demo" config={config} />);
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
    render(<StreamingModelRunner name="demo" config={config} />);

    await screen.findByText('Closed');
    expect(screen.getByText('Live stream closed')).toBeTruthy();
    expect(screen.getByText('400: Unknown screen key: OTR_B')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText(/^Frame #1/);
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
