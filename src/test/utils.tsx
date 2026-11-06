import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

export function createWrapper(client: QueryClient = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** Base64 of little-endian float32 values, as the server encodes them. */
export function encodeFloat32(values: number[]): string {
  const bytes = new Uint8Array(new Float32Array(values).buffer);
  return btoa(String.fromCharCode(...bytes));
}

/** A `text/event-stream` body the test writes to while the client reads it. */
export function createSseStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const state = { cancelled: false };
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return {
    stream,
    send(text: string) {
      if (!state.cancelled) controller.enqueue(encoder.encode(text));
    },
    sendEvent(event: string, data: unknown) {
      this.send(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      if (!state.cancelled) controller.close();
    },
  };
}

/** A live-stream `frame` payload (wire shape) with one scalar and one array output. */
export function liveFrame(frameIndex: number, value = frameIndex) {
  return {
    model: 'demo',
    version: '1',
    timestamp: frameIndex,
    frame_index: frameIndex,
    inputs: { Q: value },
    input_sources: { Q: 'live' },
    outputs: {
      s: { kind: 'scalar', value, unit: 'm', variable_class: 'ScalarVariable' },
      img: {
        kind: 'array',
        shape: [2],
        dtype: 'float32',
        data_b64: encodeFloat32([value, 1]),
        unit: '',
        variable_class: 'ArrayVariable',
      },
    },
  };
}
