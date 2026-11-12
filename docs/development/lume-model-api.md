# LUME model API

Set `VITE_LUME_API_BASE_URL` (see `.env.example`; copy it to `.env.local`). It defaults to
`http://localhost:8000`. The data layer is split in three:

- `src/api/endpoints.ts`: plain typed fetch functions. Base64 float32 payloads are decoded to
  `Float32Array`.
- `src/api/queries.ts`: `lumeKeys` and `lumeQueries`, TanStack Query `queryOptions` factories.
  Use them with `useQuery`/`useSuspenseQuery`, or with `queryClient.ensureQueryData` in router
  loaders.
- `src/hooks/useLumeApi.ts`: the hooks `useModels`, `useModelConfig`, `useMachineSnapshot` and
  `useEvaluate`. `useEvaluate` is debounced and keeps showing the previous result while it loads.

```tsx
const { data: config } = useModelConfig(model);
const { data, isPlaceholderData } = useEvaluate(model, { screen: 'OTR_B', inputs: { Q1: q } });
```

## Live stream (server-sent events)

`GET /api/v1/models/{name}/live/stream` evaluates the model over and over at the machine's
current inputs and sends each result as a `frame` event. A frame has the same shape as an evaluate
response, with `input_sources` set to `live`, or to `baseline` for a PV that couldn't be read. It
isn't a TanStack Query, because the data is pushed:

- `src/api/sse.ts`: `parseEventStream`, a `text/event-stream` parser over a `fetch` body.
- `src/api/live.ts`:
  - `openLiveStream` is one connection, as an async iterable of decoded `frame` and `error`
    events. It uses `fetch` rather than `EventSource`, so a request refused before the stream
    opens throws a `LumeApiError` with the server's `detail`. That covers a bad screen or output
    id (400), an unknown model (404), and a deployment that doesn't serve live data or has hit its
    limit on live loops (503).
  - `liveStream` is a shared, reconnecting subscription. Subscribers to the same model and
    output set share one connection, since browsers allow only about 6 per origin. Only the
    latest frame is kept.
- `src/hooks/useLiveStream.ts`: `useLiveStream(model, { screen, outputs })`.

```tsx
const { status, frame, errorMessage, error, reconnect } = useLiveStream(model, {
  screen: 'OTR3',
  outputs: ['QUAD:IN20:525:BCTRL'],
});
```

`status` is one of these values:

| `status` | Meaning |
| --- | --- |
| `idle` | Not connected: no model name, no `screen` or `outputs`, or `{ enabled: false }`. |
| `connecting` | The first connection attempt. |
| `open` | Connected. Frames come as fast as the model runs. For `cu_hxr_staged` that's a few seconds apart, with no fixed rate. |
| `reconnecting` | The connection dropped or failed, and the hook is trying again. `error` holds the cause and `frame` keeps the last frame. |
| `closed` | Stopped for good, because retrying can't fix the error. `error` says why, and `reconnect()` tries again. |

How the hook handles errors:

- **Errors on the stream.** The server sends an `error` event as `{"message": ...}` and keeps
  streaming. The hook puts its text in `errorMessage` and clears it with the next frame.
- **When it reconnects.** It reconnects when the connection drops, when the server ends the
  stream, and on 5xx responses from a proxy. It waits 1 s, then doubles the wait each time up to
  30 s, and starts again at 1 s once a frame arrives.
- **When it stops.** A 4xx, or a 503 with a JSON `detail` from the API itself, closes the stream.
- **When it disconnects.** It disconnects 0.5 s after the last component using the stream
  unmounts. The delay means a React StrictMode remount reuses the same connection.

