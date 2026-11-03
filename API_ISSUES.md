# lume-model-api issues

Issues found while developing the dashboard. Each section is written to be copied into a GitHub issue on lume-model-api.

---

## Evaluate returns 500 when an array output contains strings

**Labels:** bug

### Description

`POST /api/v1/models/{name}/evaluate` fails with `500 Internal Server Error` when the requested outputs include an `NDVariable` whose values are not numeric. For `cu_hxr_staged`, the `name` output (kind `array`, shape `[180]`, `StatVariable`) contains lattice element names such as `'BEGINNING'`. The array serializer can only encode float32, so the whole request fails, not just that output.

Because `/config` reports `name` as `kind: "array"`, a client cannot tell it apart from numeric arrays and has no way to avoid it other than hard-coding the id.

### Steps to reproduce

1. Run the API with `cu_hxr_staged`.
2. Send:

   ```http
   POST /api/v1/models/cu_hxr_staged/evaluate
   Content-Type: application/json

   { "outputs": ["name"] }
   ```

### Expected

Either the output is returned in a form that fits its content (for example `kind: "value"` with a list of strings), or `/config` classifies it so clients know not to request it as an array.

### Actual

```text
File "/app/lume_model_api/api/serialize.py", line 28, in encode_f32
  arr = np.ascontiguousarray(np.asarray(array, dtype="<f4"))
ValueError: could not convert string to float: 'BEGINNING'
```

The response is `500 Internal Server Error`.

### Suggested fix

- In `variable_kind` (`model/introspect.py`), or wherever array outputs are classified, report non-numeric `NDVariable`s as `"value"` instead of `"array"`.
- Alternatively, have `serialize_array` check the dtype and fall back to a `value` payload for non-numeric data rather than raising.
- At minimum, a single output that can't be serialized should not fail the entire evaluate request.

### Dashboard workaround

The dashboard requests only `kind === "scalar"` outputs (`src/components/ModelConfig.tsx`).

---

## An unstable input setting marks the model pool dead until the pod restarts

**Labels:** bug

### Description

When a set of inputs makes the Tao lattice unstable, `model.set()` raises a `TaoCommandError` ("UNSTABLE ORBIT AT EVALUATION POINT"). `evaluate()` turns any exception from `model.set()` into `ModelUnusable`, which marks the pool for that model dead. After that, every evaluate request returns `503 Service Unavailable` and `GET /healthz` fails until the pod restarts.

An unstable orbit is a valid physics result for an out-of-range setting, not a broken model. Any user dragging an interactive slider to an extreme can take the API down for everyone.

### Steps to reproduce

1. Run the API with `cu_hxr_staged`.
2. Evaluate with one or more magnet inputs (for example a `QUAD:*:BCTRL`) set to a value that makes the orbit unstable.
3. Send any further evaluate request.

### Expected

The bad request fails with a client error (for example `422` with the Tao message), the model is restored to its previous or baseline state, and later requests succeed.

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

- Recognise recoverable Tao errors (such as unstable orbit) in `evaluate()` (`model/evaluate.py`), re-apply the baseline or last good inputs, and return a `422` instead of raising `ModelUnusable`.
- If the model can't be reliably reset in-process, restart only the affected worker rather than marking the whole pool dead.
- Consider publishing input ranges in `/config` that are known to keep the lattice stable, so clients can bound sliders.

### Dashboard workaround

None on the client side. Restart the API container (`docker compose restart`) after this happens.
