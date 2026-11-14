/** One dispatched server-sent event. */
export interface ServerSentEvent {
  /** The `event:` field, or `message` when there was none. */
  event: string;
  /** All `data:` lines of the event, joined with `\n`. */
  data: string;
  /** The last `id:` seen on the stream so far (it carries over to later events). */
  lastEventId: string;
}

export interface ParseEventStreamOptions {
  /** Stops reading and throws the abort reason, even if the body itself ignores the abort. */
  signal?: AbortSignal;
  /** Called with a `retry:` field's reconnection time in ms. */
  onRetry?: (ms: number) => void;
}

/**
 * Parses a `text/event-stream` body as specified by the WHATWG HTML "server-sent events"
 * section: any line ending, `:` comments (keep-alive pings), multi-line `data`, `id` and
 * `retry`. A trailing event without its terminating blank line is discarded, as the spec says.
 */
export async function* parseEventStream(
  body: ReadableStream<Uint8Array>,
  { signal, onRetry }: ParseEventStreamOptions = {}
): AsyncGenerator<ServerSentEvent> {
  signal?.throwIfAborted();
  const reader = body.getReader();
  const onAbort = () => void reader.cancel(signal?.reason).catch(() => {});
  signal?.addEventListener('abort', onAbort, { once: true });
  // Strips a leading BOM and keeps multi-byte characters intact across chunk boundaries.
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];
  let lastEventId = '';
  let finished = false;

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      finished = done;
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

      const lineBreak = /\r\n|\r|\n/g;
      let start = 0;
      let match: RegExpExecArray | null;
      while ((match = lineBreak.exec(buffer))) {
        // A CR at the end of a chunk may be the first half of a CRLF split across chunks.
        if (match[0] === '\r' && match.index === buffer.length - 1 && !finished) break;
        const line = buffer.slice(start, match.index);
        start = match.index + match[0].length;

        if (line === '') {
          if (dataLines.length > 0) {
            yield { event: eventName || 'message', data: dataLines.join('\n'), lastEventId };
          }
          eventName = '';
          dataLines = [];
          continue;
        }
        if (line.startsWith(':')) continue;

        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        let fieldValue = colon === -1 ? '' : line.slice(colon + 1);
        if (fieldValue.startsWith(' ')) fieldValue = fieldValue.slice(1);

        switch (field) {
          case 'event':
            eventName = fieldValue;
            break;
          case 'data':
            dataLines.push(fieldValue);
            break;
          case 'id':
            if (!fieldValue.includes('\0')) lastEventId = fieldValue;
            break;
          case 'retry':
            if (/^\d+$/.test(fieldValue)) onRetry?.(Number(fieldValue));
            break;
        }
      }
      buffer = buffer.slice(start);
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    // Runs on early exit too (break, throw or abort), so the connection is released.
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
