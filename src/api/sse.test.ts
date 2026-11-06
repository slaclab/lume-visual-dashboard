import { describe, expect, it, vi } from 'vitest';
import { parseEventStream, type ParseEventStreamOptions, type ServerSentEvent } from './sse';

function streamOf(...chunks: (string | Uint8Array)[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>, options?: ParseEventStreamOptions) {
  const events: ServerSentEvent[] = [];
  for await (const event of parseEventStream(stream, options)) events.push(event);
  return events;
}

const simplify = (events: ServerSentEvent[]) => events.map(({ event, data }) => ({ event, data }));

describe('parseEventStream', () => {
  it('parses named events, default `message` events, comments and multi-line data', async () => {
    const events = await collect(
      streamOf(
        ': ping - 2026-11-03\n\n',
        'event: frame\ndata: {"a":1}\n\n',
        'data: line 1\ndata: line 2\n\n'
      )
    );
    expect(simplify(events)).toEqual([
      { event: 'frame', data: '{"a":1}' },
      { event: 'message', data: 'line 1\nline 2' },
    ]);
  });

  it('accepts CRLF and CR line endings, including a CRLF split across chunks', async () => {
    const events = await collect(
      streamOf('data: a\r', '\n\r\n', 'data: b\r\r', 'event: x\r\ndata: c\r\n\r\n')
    );
    expect(simplify(events)).toEqual([
      { event: 'message', data: 'a' },
      { event: 'message', data: 'b' },
      { event: 'x', data: 'c' },
    ]);
  });

  it('reassembles lines and multi-byte characters split across chunks', async () => {
    const bytes = new TextEncoder().encode('event: fr');
    const rest = new TextEncoder().encode('ame\ndata: é→\n\n');
    // Split inside the two-byte "é".
    const cut = rest.indexOf(0xc3) + 1;
    const events = await collect(streamOf(bytes, rest.slice(0, cut), rest.slice(cut)));
    expect(simplify(events)).toEqual([{ event: 'frame', data: 'é→' }]);
  });

  it('strips one leading space and handles fields without a colon', async () => {
    const events = await collect(streamOf('data:no-space\n\n', 'data:  two\n\n', 'data\n\n'));
    expect(events.map((e) => e.data)).toEqual(['no-space', ' two', '']);
  });

  it('does not dispatch events without data, or a trailing event without a blank line', async () => {
    const events = await collect(streamOf('event: empty\n\n', 'data: ok\n\n', 'data: cut off'));
    expect(events.map((e) => e.data)).toEqual(['ok']);
  });

  it('carries the last event id over and reports `retry`', async () => {
    const onRetry = vi.fn();
    const events = await collect(
      streamOf('id: 7\ndata: a\n\n', 'data: b\n\n', 'retry: 2500\n\n', 'retry: soon\n\n'),
      { onRetry }
    );
    expect(events.map((e) => e.lastEventId)).toEqual(['7', '7']);
    expect(onRetry.mock.calls).toEqual([[2500]]);
  });

  it('cancels the stream when the consumer stops early', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: 1\n\ndata: 2\n\n'));
      },
      cancel,
    });
    for await (const event of parseEventStream(stream)) {
      expect(event.data).toBe('1');
      break;
    }
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('throws and cancels the stream on abort, even while waiting for data', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const controller = new AbortController();
    const next = parseEventStream(stream, { signal: controller.signal }).next();
    controller.abort();
    await expect(next).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancel).toHaveBeenCalled();
  });
});
