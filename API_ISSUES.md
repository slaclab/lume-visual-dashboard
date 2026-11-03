# lume-model-api issues

Each section below is written to be copied into a GitHub issue on
[slaclab/lume-model-api](https://github.com/slaclab/lume-model-api). Checked against `main` at
`e5c6dab` and the dev cluster (`ghcr.io/slaclab/lume-model-api:dev`) on 2026-11-03.

---

## `POST /evaluate` returns 500 when a requested array output contains strings

**Labels:** bug

### Description

`POST /api/v1/models/{name}/evaluate` returns `500 Internal Server Error` when `outputs` includes
an `NDVariable` with non-numeric values. On `cu_hxr_staged`, the `name` output (a `StatVariable`)
holds lattice element names such as `'BEGINNING'`. `encode_f32` (`api/serialize.py`) can only
encode float32, so it raises, and the whole request fails, including any valid outputs requested
alongside it.

`GET /config` publishes `name` as `kind: "array"`, the same as numeric arrays, so a client has no
way to know from the contract that requesting it will fail.

### Reproduce locally

1. Run the API with `cu_hxr_staged`.
2. Send:

   ```http
   POST /api/v1/models/cu_hxr_staged/evaluate
   Content-Type: application/json

   { "outputs": ["name"] }
   ```

Without `end_element`, `name` has shape `[180]`. The request fails the same way at any shape.

### Reproduce on the dev cluster

This is read-only and doesn't affect the pods. The ingress only accepts SLAC-internal addresses.

```bash
BASE=https://ad-accel-online-ml-dev.slac.stanford.edu/lume-model-api

# 1. The contract says `name` is an array output.
curl -s "$BASE/api/v1/models/cu_hxr_staged/config" | jq '.outputs[] | select(.id == "name")'
# {"id": "name", "kind": "array", "unit": "", "shape": [29], "element_name": null,
#  "variable_class": "StatVariable", "alias_of": null}

# 2. Requesting it fails the whole request.
curl -s -X POST "$BASE/api/v1/models/cu_hxr_staged/evaluate" \
  -H 'Content-Type: application/json' \
  -d '{"outputs": ["name"]}' \
  -w '\nHTTP %{http_code}\n'
# Internal Server Error
# HTTP 500

# 3. Traceback. The request can land on either eval pod, so read both.
kubectl -n lume-model-api logs -l app=lume-model-api-eval --prefix --tail=200 \
  | grep -B2 -A2 'could not convert string to float'
```

### Expected

One of:

- the output is returned in a form that fits its content, for example `kind: "value"` with a list
  of strings, or
- `/config` classifies it so clients know not to request it as an array, or
- the request is rejected with a `4xx` that names the output.

### Actual

`500 Internal Server Error` with no body detail. Server log:

```text
File "/app/lume_model_api/api/serialize.py", line 28, in encode_f32
  arr = np.ascontiguousarray(np.asarray(array, dtype="<f4"))
ValueError: could not convert string to float: 'BEGINNING'
```

### Suggested fix

- In `variable_kind` (`model/introspect.py`), report an `NDVariable` with a non-numeric dtype as
  `"value"` instead of `"array"`.
- Or have the array serializer check the dtype and fall back to a `value` payload instead of
  raising.
- Either way, one output that can't be serialized shouldn't fail every other output in the
  request.

---

## An in-range input that makes the Tao orbit unstable restarts the eval pod

**Labels:** bug, enhancement

### Description

Some input values inside the range `GET /config` publishes make the Tao lattice unstable.
`model.set()` raises `TaoCommandError` ("UNSTABLE ORBIT AT EVALUATION POINT"), `evaluate()` wraps
it as `ModelUnusable`, and `pool._attempt_recovery` finds no `recover()` on the model. The worker
latches, the pool is marked dead, every evaluate on that pod returns `503`, and `/healthz` fails
until the probes restart the pod.

The 503 and restart are the documented behavior for a model that can't recover
(`docs/maintainer/DESIGN_DECISIONS.md`, "Model failures are 503, not 400" and "Recovery belongs in
the model"). The problem is that this path can be reached with an ordinary request that passes
validation:

- The value is inside the published `min`/`max`, so clients that respect `/config` can still send
  it. `scripts/check_poisoned_worker.py` notes that `BEND:LI21:215:BCTRL = 0.209` is inside its
  published range `[0.11, 0.33]`.
- An interactive client sweeping an input can trigger it. Repeating the request across replicas can
  restart every eval pod, so one user can make evaluate unavailable for everyone until the restarts
  finish.
- `DESIGN_DECISIONS.md` notes that from lume-bmad `0.1.1` (pinned `0.1.2`), a bend set that Tao
  rejects already restores the model's previous state, and a test on 2026-10-28 found the restored
  instance usable. The service still treats this case as unrecoverable.

### Reproduce locally

1. Run the API with `cu_hxr_staged`.
2. Evaluate with one or more magnet inputs (for example a `QUAD:*:BCTRL`) set to a value that
   makes the orbit unstable.
3. Send any further evaluate request.

### Reproduce on the dev cluster

**Warning: this poisons the eval workers it reaches and restarts those pods.** Coordinate before
running it on the shared dev cluster.

The dev eval Deployment sets `end_element: "OTR3"`, so its `/config` publishes 16 inputs and
**doesn't include** `BEND:LI21:215:BCTRL`, the trigger used by `scripts/check_poisoned_worker.py`.
Run against dev as it is, that script gets a `400` for an unknown input rather than reproducing
the bug. The only bend dev publishes is `BEND:IN20:661:BCTRL` (default `0.1350`, range
`[0.0675, 0.2025]`). The value below is about 5% off default and inside that range. **It hasn't
been confirmed to trigger the unstable orbit on dev.** If it returns `200`, step it further from
the default while staying inside the range.

```bash
BASE=https://ad-accel-online-ml-dev.slac.stanford.edu/lume-model-api
NS=lume-model-api

# 1. Baseline: pods healthy, note the RESTARTS column.
kubectl -n $NS get pods -l app=lume-model-api-eval

# 2. Send the in-range bend setting. There are 2 eval replicas behind the ingress, so repeat it
#    to reach both.
for i in 1 2 3 4; do
  curl -s -X POST "$BASE/api/v1/models/cu_hxr_staged/evaluate" \
    -H 'Content-Type: application/json' \
    -d '{"inputs": {"BEND:IN20:661:BCTRL": 0.142}, "outputs": ["QUAD:IN20:525:BACT"], "max_particles": 5}' \
    -w '  HTTP %{http_code}\n' -o /dev/null
done

# 3. A request that sets nothing now fails too.
curl -s -X POST "$BASE/api/v1/models/cu_hxr_staged/evaluate" \
  -H 'Content-Type: application/json' \
  -d '{"inputs": {}, "outputs": ["QUAD:IN20:525:BACT"], "max_particles": 5}' \
  -w '\nHTTP %{http_code}\n'
# expected while poisoned: HTTP 503

# 4. Watch the readiness/liveness probes fail and the pods restart.
kubectl -n $NS get pods -l app=lume-model-api-eval -w

# 5. The Tao error and the dead-pool message are in the previous container's log.
kubectl -n $NS logs <eval-pod-name> --previous | grep -E 'UNSTABLE ORBIT|ModelUnusable|is dead'

# 6. If the pods don't come back on their own:
kubectl -n $NS rollout restart deployment/lume-model-api-eval
```

To use the known trigger instead, deploy a model entry without `end_element`, then run
`LUME_API=$BASE python scripts/check_poisoned_worker.py`.

### Expected

The request that produced the unstable orbit fails with a client error (for example `422` with
the Tao message), the model is back at its previous or baseline state, and later requests on that
worker succeed. The pod isn't restarted.

### Actual

```text
pytao.errors.TaoCommandError: Command: 'set global lattice_calc_on = T' causes errors in the function(s): tao_set_invalid
  UNSTABLE ORBIT AT EVALUATION POINT
  FOR DATUM: BC1.energy[2] with data_type: e_tot_ref
...
lume_model_api.model.evaluate.ModelUnusable: The model failed while applying inputs and may be left inconsistent
ERROR:lume_model_api.api.pool:Pool for model 'cu_hxr_staged' is dead (unusable). Every evaluate for this model will now fail and GET /healthz reports unhealthy so the pod restarts.
"POST /api/v1/models/cu_hxr_staged/evaluate HTTP/1.1" 503 Service Unavailable
```

### Suggested fix

- Add the `recover()` described in "Recovery belongs in the model" (disable lattice calc, write
  back baseline controls, restore `track_type`, re-enable calc, refresh state) to lume-bmad or
  virtual-accelerator, so `_attempt_recovery` returns `ok` and the pool stays alive. Track that
  here if it lands in another repo.
- Given that lume-bmad `>=0.1.1` already restores state after a rejected bend set, consider
  treating the unstable-orbit `TaoCommandError` as a client error (`422`) instead of
  `ModelUnusable`, once it's verified on the dev cluster.
- Make the `/config` ranges for inputs like bends reflect what keeps the lattice stable, or
  document that an in-range value can still be rejected, so clients can bound their inputs.
