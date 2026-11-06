# lume-model-api issues

Each section below is written to be copied into a GitHub issue on
[slaclab/lume-model-api](https://github.com/slaclab/lume-model-api). Checked against `main` at
`e5c6dab` and a local `cu_hxr_staged` container on 2026-11-03.

---

## Browsers on another origin can't read `Retry-After`, so a busy or restarting pool looks permanent

Filed as [slaclab/lume-model-api#9](https://github.com/slaclab/lume-model-api/issues/9).

**Labels:** bug

### Description

`POST /api/v1/models/{name}/evaluate` returns 503 with `Retry-After` for two different cases:

- `Retry-After: 2` when the pool is busy (`RETRY_AFTER_SATURATED`)
- `Retry-After: 30` when the pool is dead and the pod is restarting (`RETRY_AFTER_RESTARTING`)

A browser client on another origin can't read either header. `Retry-After` isn't a
[CORS-safelisted response header](https://fetch.spec.whatwg.org/#cors-safelisted-response-header-name),
so a cross-origin page sees it only if the response names it in
`Access-Control-Expose-Headers`. The `CORSMiddleware` in `api/main.py` sets `allow_origins`,
`allow_methods` and `allow_headers`, but not `expose_headers`, so the API never sends that header
and `response.headers.get("Retry-After")` returns `null` in the browser.

The frontend docs tell clients to decide on retries from this header. The error table in
[QUICKSTART.md](https://github.com/slaclab/lume-model-api/blob/main/docs/frontend/QUICKSTART.md#handle-errors)
lists "503 with no `Retry-After`" as "Retrying won't help". A cross-origin client that follows the
docs therefore treats a busy pool, which would recover in 2 s, and a restarting pod, which would
recover in 30 s, as permanent failures. The `evaluate` example in the same doc reads the header
with `response.headers.get("Retry-After")`, which only works on the same origin.

This affects any browser UI on a different origin from the API:

- **Local development.** The Vite dev server is on `http://localhost:5173` and the API is on
  `http://localhost:8000`. The same applies when a local UI points at the dev cluster.
- **UIs on other hosts.** Any UI not served from the API's own ingress host.

A UI on the same ingress host as the API is unaffected. So are non-browser clients such as curl,
Python and notebooks.

### Reproduce locally

1. Run the API (`cu_hxr_staged`, or `demo`) on port 8000. The server does send the header to
   non-browser clients. While something else keeps more requests in flight than the pool's limit
   (for example
   `seq 40 | xargs -P 40 -I{} curl -s -o /dev/null -X POST localhost:8000/api/v1/models/cu_hxr_staged/evaluate -H 'Content-Type: application/json' -d '{"screen":"OTR3"}'`
   in a loop), run:

   ```bash
   curl -s -D - -o /dev/null -H 'Origin: http://localhost:5173' \
     -X POST localhost:8000/api/v1/models/cu_hxr_staged/evaluate \
     -H 'Content-Type: application/json' -d '{"screen":"OTR3"}'
   # HTTP/1.1 503 Service Unavailable
   # retry-after: 2
   # content-type: application/json
   # access-control-allow-origin: *
   # vary: Origin
   #   (no access-control-expose-headers)
   ```

2. Run the same request from a page on another origin (e.g. the browser console on
   `http://localhost:5173`) while the pool is saturated:

   ```js
   const r = await fetch("http://localhost:8000/api/v1/models/cu_hxr_staged/evaluate", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ screen: "OTR3" }),
   });
   [r.status, r.headers.get("Retry-After"), [...r.headers.keys()]];
   // [503, null, ["content-length", "content-type"]]
   // body: {"detail": "pool saturated (8 in flight)"}
   ```

A single browser can't saturate the pool on its own, because it opens only about 6 connections
per origin. Use the curl loop from step 1 to keep the pool full.

### Expected

Cross-origin browser clients can read `Retry-After`, as the frontend docs assume, so they can tell
a busy pool (2 s) and a restarting pod (30 s) apart from a 503 that retrying won't fix.

### Actual

In a cross-origin browser, every 503 looks like "503 with no `Retry-After`". That is the case the
docs say not to retry.

### Suggested fix

Expose the header in the CORS middleware:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
)
```

Then add a test that a 503 from `evaluate`, sent with an `Origin` header, includes
`Access-Control-Expose-Headers: Retry-After`.

### Client workaround until then

`lume-visual-dashboard` tells the 503s apart by their body instead of the header. A JSON `detail`
means the API answered; anything else came from a proxy or ingress. For the live stream it
retries the proxy 503s and stops on the API's own 503s ("not served" and the loop limit). That
works for the stream but not for `evaluate`, where the busy and dead-pool 503s also have a JSON
`detail` and can only be told apart by their wording.
