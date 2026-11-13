# Local services (Docker Compose)

`compose.yaml` runs the dashboard and both APIs it calls, built from the submodules in `external/`.

## Dev server

Run the Vite dev server with hot reloading at `http://localhost:5173`:

```sh
docker compose up
```

The project directory is bind-mounted into the container, and `node_modules` lives in a Docker volume so it doesn't conflict with your host install. Dependencies are re-synced from the lockfile each time the container starts.

## lume-model-api

`docker compose up` also starts `lume-model-api` at `http://localhost:8000` (Swagger UI at `/docs`), which the dashboard calls by default:

- **Model.** It hosts the real `cu_hxr_staged` model, tracked to `OTR3` with 1000 particles. The image is built from the upstream `external/lume-model-api/Dockerfile`, which installs conda, Bmad, torch and the lattices.
- **Platform.** The image is amd64-only, so on Apple Silicon the first build and each model start are slow under emulation. The container isn't healthy until every worker has built the model, which can take a few minutes.
- **Code changes.** Edits under `external/lume-model-api/` need `docker compose up --build lume-model-api`.
- **Live stream.** The container serves `live/stream` and `machine-snapshot` from the same port as config and evaluate (`LUME_ROLE=all`), so streaming needs no extra service. On the cluster those two routes run on a separate live pod behind the same base URL. EPICS can't be reached from the container, so the live inputs are synthetic: they oscillate around each input's default.

To watch the raw stream:

```sh
curl -N "http://localhost:8000/api/v1/models/cu_hxr_staged/live/stream?screen=OTR3"
```

## Canopy

`docker compose up` also starts Canopy from `external/canopy` at `http://localhost:8050` (Swagger UI at `/docs`). It runs the API only (no Postgres, Redis or worker), which is all Hare needs, and reloads when you edit `external/canopy/src/`. The EPICS backend is simulated, so any PV name returns synthetic data. The name's suffix picks the value kind: `:ENUM`, `:WF`, `:STR`, `:TABLE`, and anything else is a scalar sine wave. Prefix a name with `pva://` to use PV Access. The service accepts one read-only, Hare-only API key, `dev`:

```sh
curl -H "X-API-Key: dev" http://localhost:8050/hare/v1/pvs/TEST:SINE
```

If port 8050 is taken, set `CANOPY_HOST_PORT` for compose and point `VITE_CANOPY_API_BASE_URL` at the new port.

### Reading from a real IOC

To read from a real IOC instead, set the EPICS variables in a repo-root `.env`. Docker Compose reads that file, not `.env.local`, which is only for Vite settings. See `.env.example`, then run `docker compose up -d canopy`:

```sh
CANOPY_EPICS__BACKEND=epics
EPICS_CA_ADDR_LIST=10.0.0.42          # space-separated IOC IPs; host.docker.internal for an IOC on this machine
EPICS_CA_AUTO_ADDR_LIST=NO
EPICS_PVA_ADDR_LIST=10.0.0.42         # for pva:// names
EPICS_PVA_AUTO_ADDR_LIST=NO
```

Docker's bridged network can't carry EPICS broadcast discovery, so list each IOC's address explicitly. The container reaches IOCs through your machine, so it needs the same network access (for SLAC IOCs, the right network or VPN). The frontend needs no changes. A read of a PV that can't be reached waits for `CANOPY_EPICS__CA_TIMEOUT_S` (default 5 s), then returns `connected: false` with an `error` message. To try this without facility access, run Canopy's test IOC on your machine from `external/canopy`, then set `EPICS_CA_ADDR_LIST=host.docker.internal`. The IOC's beacon warnings are harmless:

```sh
EPICS_CAS_AUTO_BEACON_ADDR_LIST=NO EPICS_CAS_BEACON_ADDR_LIST=127.0.0.1 \
  uv run --no-project --with caproto python scripts/sim_ioc.py
```

### Apple Silicon

The `canopy` image is built for `linux/amd64` because PyPI has no Linux arm64 wheels for `p4p`/`pvxslibs`, and the versions built from source don't match ("PVXS ABI mismatch"), so the `epics` backend can't start. On Apple Silicon it runs under emulation.

## Production image

`Dockerfile` is for local development only. The production image used by [Kubernetes](../deployment/kubernetes.md) is built from `Dockerfile.prod` (static build served by unprivileged nginx on port 8080, with a health check at `/healthz`).

To run the production image locally via compose (served at `http://localhost:8080`):

```sh
docker compose --profile prod up --build
```

The production image is built for the `/lume-visual-dashboard/` URL path by default. Override `BASE_PATH` to serve it from the root when running it standalone:

```sh
docker build -f Dockerfile.prod --build-arg BASE_PATH=/ -t lume-visual-dashboard .
docker run --rm -p 8080:8080 lume-visual-dashboard
```

