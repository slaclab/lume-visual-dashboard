import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LumeApiError } from './client';
import {
  closeAllLiveStreams,
  hasLiveStreamTargets,
  liveStream,
  liveStreamTiming,
  liveStreamUrl,
  normalizeLiveStreamRequest,
  openLiveStream,
} from './live';
import type { LiveStreamEvent } from './types';
import { server, TEST_BASE_URL } from '../test/server';
import { createSseStream, liveFrame } from '../test/utils';

const STREAM_URL = `${TEST_BASE_URL}/api/v1/models/demo/live/stream`;

const sseResponse = (stream: ReadableStream<Uint8Array>) =>
  new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });

/** Serves a fresh stream per request and records each one. */
function serveStreams() {
  const streams: ReturnType<typeof createSseStream>[] = [];
  const requests: Request[] = [];
  server.use(
    http.get(STREAM_URL, ({ request }) => {
      const sse = createSseStream();
      streams.push(sse);
      requests.push(request);
      return sseResponse(sse.stream);
    })
  );
  return { streams, requests };
}

const defaultTiming = { ...liveStreamTiming };
beforeEach(() => {
  Object.assign(liveStreamTiming, { initialRetryMs: 10, maxRetryMs: 40, teardownMs: 20 });
});
afterEach(() => {
  closeAllLiveStreams();
  Object.assign(liveStreamTiming, defaultTiming);
});

describe('live stream request helpers', () => {
  it('normalizes outputs and drops an empty screen', () => {
    expect(normalizeLiveStreamRequest({ outputs: ['b', ' a', 'b', ''], screen: '' })).toEqual({
      outputs: ['a', 'b'],
    });
    expect(normalizeLiveStreamRequest({ screen: 'OTR_B' })).toEqual({
      outputs: [],
      screen: 'OTR_B',
    });
  });

  it('requires a screen or outputs', () => {
    expect(hasLiveStreamTargets({})).toBe(false);
    expect(hasLiveStreamTargets({ outputs: [] })).toBe(false);
    expect(hasLiveStreamTargets({ screen: 'OTR_B' })).toBe(true);
    expect(hasLiveStreamTargets({ outputs: ['s'] })).toBe(true);
  });

  it('builds the URL with an encoded model name and comma-separated outputs', () => {
    expect(liveStreamUrl('demo x', { screen: 'OTR_B', outputs: ['x.beta', 's'] })).toBe(
      `${TEST_BASE_URL}/api/v1/models/demo%20x/live/stream?screen=OTR_B&outputs=s%2Cx.beta`
    );
    expect(liveStreamUrl('demo', {})).toBe(STREAM_URL);
  });
});

describe('openLiveStream', () => {
  it('yields decoded frames and server error events', async () => {
    let accept: string | null = null;
    let outputs: string | null = null;
    server.use(
      http.get(STREAM_URL, ({ request }) => {
        accept = request.headers.get('accept');
        outputs = new URL(request.url).searchParams.get('outputs');
        const sse = createSseStream();
        sse.send(': ping\n\n');
        sse.sendEvent('frame', liveFrame(1, 2.5));
        sse.sendEvent('error', { message: 'Live evaluation failed.' });
        sse.sendEvent('unknown', {});
        sse.close();
        return sseResponse(sse.stream);
      })
    );

    const onOpen = vi.fn();
    const events: LiveStreamEvent[] = [];
    for await (const event of openLiveStream('demo', { outputs: ['s', 'img'] }, { onOpen })) {
      events.push(event);
    }

    expect(accept).toBe('text/event-stream');
    expect(outputs).toBe('img,s');
    expect(onOpen).toHaveBeenCalledOnce();
    expect(events.map((e) => e.type)).toEqual(['frame', 'error']);
    const [frame, error] = events;
    if (frame.type !== 'frame' || error.type !== 'error') throw new Error('unexpected events');
    expect(frame.frame.frame_index).toBe(1);
    expect(frame.frame.input_sources).toEqual({ Q: 'live' });
    const img = frame.frame.outputs.img;
    expect(img.kind === 'array' && Array.from(img.data)).toEqual([2.5, 1]);
    expect(error.message).toBe('Live evaluation failed.');
  });

  it('throws LumeApiError with the detail when the stream is refused', async () => {
    server.use(
      http.get(STREAM_URL, () =>
        HttpResponse.json({ detail: 'Unknown screen key: NOPE' }, { status: 400 })
      )
    );
    const events = openLiveStream('demo', { screen: 'NOPE' });
    const error = await events.next().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LumeApiError);
    expect((error as LumeApiError).message).toBe('400: Unknown screen key: NOPE');
  });

  it('stops reading when aborted', async () => {
    const { streams } = serveStreams();
    const controller = new AbortController();
    const events = openLiveStream('demo', { screen: 'OTR_B' }, { signal: controller.signal });
    const first = events.next();
    await vi.waitFor(() => expect(streams).toHaveLength(1));
    streams[0].sendEvent('frame', liveFrame(1));
    expect((await first).done).toBe(false);

    const second = events.next();
    controller.abort();
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    expect((await events.next()).done).toBe(true);
  });
});

describe('liveStream', () => {
  it('shares one connection between subscribers of an equivalent request', async () => {
    const { streams } = serveStreams();
    const a = liveStream('demo', { outputs: ['s', 'img'] });
    const b = liveStream('demo', { outputs: ['img', 's', 's'] });
    const onA = vi.fn();
    const onB = vi.fn();
    a.subscribe(onA);
    b.subscribe(onB);
    expect(a.getSnapshot().status).toBe('connecting');

    await vi.waitFor(() => expect(a.getSnapshot().status).toBe('open'));
    streams[0].sendEvent('frame', liveFrame(3));
    await vi.waitFor(() => expect(b.getSnapshot().frame?.frame_index).toBe(3));

    expect(streams).toHaveLength(1);
    expect(a.getSnapshot()).toBe(b.getSnapshot());
    expect(onA).toHaveBeenCalled();
    expect(onB).toHaveBeenCalled();
  });

  it('keeps only the latest frame and clears the error message on the next frame', async () => {
    const { streams } = serveStreams();
    const handle = liveStream('demo', { screen: 'OTR_B' });
    handle.subscribe(() => {});
    await vi.waitFor(() => expect(streams).toHaveLength(1));

    streams[0].sendEvent('frame', liveFrame(1));
    streams[0].sendEvent('error', { message: 'Live evaluation failed.' });
    await vi.waitFor(() =>
      expect(handle.getSnapshot().errorMessage).toBe('Live evaluation failed.')
    );
    expect(handle.getSnapshot().frame?.frame_index).toBe(1);
    expect(handle.getSnapshot().status).toBe('open');

    streams[0].sendEvent('frame', liveFrame(2));
    await vi.waitFor(() => expect(handle.getSnapshot().frame?.frame_index).toBe(2));
    expect(handle.getSnapshot().errorMessage).toBeUndefined();
  });

  it('reconnects when the server ends the stream, keeping the last frame meanwhile', async () => {
    const { streams } = serveStreams();
    const handle = liveStream('demo', { screen: 'OTR_B' });
    const statuses: string[] = [];
    handle.subscribe(() => statuses.push(handle.getSnapshot().status));
    await vi.waitFor(() => expect(streams).toHaveLength(1));

    streams[0].sendEvent('frame', liveFrame(1));
    streams[0].close();
    await vi.waitFor(() => expect(streams).toHaveLength(2));
    expect(handle.getSnapshot().frame?.frame_index).toBe(1);

    streams[1].sendEvent('frame', liveFrame(2));
    await vi.waitFor(() => expect(handle.getSnapshot().frame?.frame_index).toBe(2));
    expect(handle.getSnapshot().status).toBe('open');
    expect(statuses).toContain('reconnecting');
  });

  it('retries a proxy 503 and network errors, exposing the last error meanwhile', async () => {
    let calls = 0;
    server.use(
      http.get(STREAM_URL, () => {
        calls += 1;
        if (calls === 1) return new HttpResponse('<html>503</html>', { status: 503 });
        if (calls === 2) return HttpResponse.error();
        const sse = createSseStream();
        sse.sendEvent('frame', liveFrame(1));
        return sseResponse(sse.stream);
      })
    );
    const handle = liveStream('demo', { screen: 'OTR_B' });
    const errors: (Error | undefined)[] = [];
    handle.subscribe(() => errors.push(handle.getSnapshot().error));

    await vi.waitFor(() => expect(handle.getSnapshot().frame?.frame_index).toBe(1));
    expect(calls).toBe(3);
    expect(errors.some((e) => e instanceof LumeApiError && e.status === 503)).toBe(true);
    expect(handle.getSnapshot()).toMatchObject({ status: 'open', error: undefined });
  });

  it.each([
    [400, { detail: 'Unknown output id(s): NOPE' }],
    [503, { detail: 'live view not served by this instance' }],
  ])('closes without retrying on a %i from the API', async (status, body) => {
    let calls = 0;
    server.use(
      http.get(STREAM_URL, () => {
        calls += 1;
        return HttpResponse.json(body, { status });
      })
    );
    const handle = liveStream('demo', { outputs: ['NOPE'] });
    handle.subscribe(() => {});

    await vi.waitFor(() => expect(handle.getSnapshot().status).toBe('closed'));
    const { error } = handle.getSnapshot();
    expect(error).toBeInstanceOf(LumeApiError);
    expect(error?.message).toBe(`${status}: ${body.detail}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(1);
  });

  it('honours Retry-After on a 503', async () => {
    let calls = 0;
    server.use(
      http.get(STREAM_URL, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { detail: 'restarting' },
            { status: 503, headers: { 'Retry-After': '0' } }
          );
        }
        const sse = createSseStream();
        sse.sendEvent('frame', liveFrame(1));
        return sseResponse(sse.stream);
      })
    );
    const handle = liveStream('demo', { screen: 'OTR_B' });
    handle.subscribe(() => {});
    await vi.waitFor(() => expect(handle.getSnapshot().frame?.frame_index).toBe(1));
    expect(calls).toBe(2);
  });

  it('reconnect() reopens a closed stream', async () => {
    let calls = 0;
    server.use(
      http.get(STREAM_URL, () => {
        calls += 1;
        if (calls === 1) return HttpResponse.json({ detail: 'loop limit' }, { status: 503 });
        const sse = createSseStream();
        sse.sendEvent('frame', liveFrame(1));
        return sseResponse(sse.stream);
      })
    );
    const handle = liveStream('demo', { screen: 'OTR_B' });
    handle.subscribe(() => {});
    await vi.waitFor(() => expect(handle.getSnapshot().status).toBe('closed'));

    handle.reconnect();
    expect(handle.getSnapshot()).toMatchObject({ status: 'connecting', error: undefined });
    await vi.waitFor(() => expect(handle.getSnapshot().frame?.frame_index).toBe(1));
  });

  it('disconnects shortly after the last subscriber leaves, unless one comes back', async () => {
    const { streams, requests } = serveStreams();
    const handle = liveStream('demo', { screen: 'OTR_B' });
    const unsubscribe = handle.subscribe(() => {});
    await vi.waitFor(() => expect(handle.getSnapshot().status).toBe('open'));

    // A remount within the teardown delay keeps the same connection.
    unsubscribe();
    const unsubscribeAgain = handle.subscribe(() => {});
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(streams).toHaveLength(1);
    expect(requests[0].signal.aborted).toBe(false);

    unsubscribeAgain();
    await vi.waitFor(() => expect(requests[0].signal.aborted).toBe(true));
    expect(handle.getSnapshot().status).toBe('connecting');
    // Torn down for good: no reconnect follows the abort.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(streams).toHaveLength(1);
  });
});
