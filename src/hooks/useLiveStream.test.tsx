import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeAllLiveStreams, liveStreamTiming } from '../api/live';
import type { LiveStreamRequest } from '../api/types';
import { server, TEST_BASE_URL } from '../test/server';
import { createSseStream, liveFrame } from '../test/utils';
import { useLiveStream } from './useLiveStream';

const STREAM_URL = `${TEST_BASE_URL}/api/v1/models/demo/live/stream`;

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

const defaultTiming = { ...liveStreamTiming };
beforeEach(() => {
  Object.assign(liveStreamTiming, { initialRetryMs: 10, maxRetryMs: 40, teardownMs: 20 });
});
afterEach(() => {
  closeAllLiveStreams();
  Object.assign(liveStreamTiming, defaultTiming);
});

describe('useLiveStream', () => {
  it.each<[string, string | undefined, LiveStreamRequest, boolean]>([
    ['without a model name', undefined, { screen: 'OTR_B' }, true],
    ['with nothing requested', 'demo', { outputs: [] }, true],
    ['when disabled', 'demo', { screen: 'OTR_B' }, false],
  ])('is idle and does not connect %s', async (_, name, request, enabled) => {
    // Any request would fail the test: MSW is set to error on unhandled requests.
    const { result } = renderHook(() => useLiveStream(name, request, { enabled }));
    expect(result.current.status).toBe('idle');
    expect(result.current.frame).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  it('connects, then shows the latest frame and server error messages', async () => {
    const { streams } = serveStreams();
    const { result } = renderHook(() => useLiveStream('demo', { screen: 'OTR_B' }));
    expect(result.current.status).toBe('connecting');

    await waitFor(() => expect(result.current.status).toBe('open'));
    act(() => streams[0].sendEvent('frame', liveFrame(4, 1.5)));
    await waitFor(() => expect(result.current.frame?.frame_index).toBe(4));
    const s = result.current.frame?.outputs.s;
    expect(s?.kind === 'scalar' && s.value).toBe(1.5);

    act(() => streams[0].sendEvent('error', { message: 'Live evaluation failed.' }));
    await waitFor(() => expect(result.current.errorMessage).toBe('Live evaluation failed.'));
  });

  it('shares one connection between components and survives a StrictMode remount', async () => {
    const { streams } = serveStreams();
    const { result } = renderHook(
      () => ({
        a: useLiveStream('demo', { outputs: ['s', 'img'] }),
        b: useLiveStream('demo', { outputs: ['img', 's'] }),
      }),
      { wrapper: StrictMode }
    );
    await waitFor(() => expect(result.current.a.status).toBe('open'));
    act(() => streams[0].sendEvent('frame', liveFrame(1)));
    await waitFor(() => expect(result.current.b.frame?.frame_index).toBe(1));
    expect(streams).toHaveLength(1);
  });

  it('switches streams when the request changes and disconnects on unmount', async () => {
    const { streams, requests } = serveStreams();
    const { result, rerender, unmount } = renderHook(
      ({ screen }) => useLiveStream('demo', { screen }),
      { initialProps: { screen: 'OTR_A' } }
    );
    await waitFor(() => expect(result.current.status).toBe('open'));

    rerender({ screen: 'OTR_B' });
    await waitFor(() => expect(streams).toHaveLength(2));
    expect(new URL(requests[1].url).searchParams.get('screen')).toBe('OTR_B');
    await waitFor(() => expect(requests[0].signal.aborted).toBe(true));

    unmount();
    await waitFor(() => expect(requests[1].signal.aborted).toBe(true));
  });

  it('reports a fatal error as closed, and reconnect() tries again', async () => {
    let calls = 0;
    server.use(
      http.get(STREAM_URL, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ detail: 'Unknown screen key: NOPE' }, { status: 400 });
        }
        const sse = createSseStream();
        sse.sendEvent('frame', liveFrame(1));
        return new HttpResponse(sse.stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );
    const { result } = renderHook(() => useLiveStream('demo', { screen: 'NOPE' }));
    await waitFor(() => expect(result.current.status).toBe('closed'));
    expect(result.current.error?.message).toBe('400: Unknown screen key: NOPE');

    act(() => result.current.reconnect());
    await waitFor(() => expect(result.current.frame?.frame_index).toBe(1));
    expect(result.current.status).toBe('open');
  });
});
