# LUME Visual Dashboard

A React dashboard for visualizing LUME accelerator models.

## What's included

- **React 19** with **TypeScript**
- **Vite** for fast dev server and builds
- **TanStack Query** for fetching and caching lume-model-api and Canopy (Hare live PV) data, with types generated from their OpenAPI schemas
- **Carbon Design System** and **ECharts** for UI and plots
- **Vitest** + **React Testing Library** + **MSW** for unit/integration tests
- **ESLint** + **Prettier** + **Husky** pre-commit hooks for consistent code style
- **Zensical** (MkDocs-based) documentation site with GitHub Pages deployment
- GitHub Actions workflows for lint, type-check, test, docs deployment and image builds
- Docker Compose for local development and Kustomize manifests for staging and prod

## Getting started

### Clone the repository

```sh
git clone --recurse-submodules https://github.com/slaclab/lume-visual-dashboard.git
cd lume-visual-dashboard
```

[lume-model-api](https://github.com/slaclab/lume-model-api) and [Canopy](https://github.com/slaclab/canopy) are git submodules in `external/`. The local API services in `compose.yaml` and `pnpm gen:api` use them. If you cloned without `--recurse-submodules`, fetch them with:

```sh
git submodule update --init
```

Each submodule is pinned to a commit. To move one to the latest upstream `main`, then commit the new pointer:

```sh
git submodule update --remote external/canopy
git add external/canopy && git commit -m "Bump canopy"
```

`git pull` doesn't update submodules on its own. Run `git submodule update` after pulling, or set `git config submodule.recurse true` once. A submodule is checked out at a fixed commit rather than on a branch (detached `HEAD`), so run `git switch main` (or create a branch) inside it before making changes there.

### Install dependencies

Requires [pnpm](https://pnpm.io/installation).

```sh
pnpm install
```

## Development

| Command               | Description                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm dev`            | Start dev server at `http://localhost:5173`                                                             |
| `pnpm build`          | Type-check and build for production                                                                     |
| `pnpm preview`        | Preview production build locally                                                                        |
| `pnpm test`           | Run tests once                                                                                          |
| `pnpm test:watch`     | Run tests in watch mode                                                                                 |
| `pnpm test:coverage`  | Run tests with coverage report                                                                          |
| `pnpm lint`           | Run ESLint                                                                                              |
| `pnpm lint:fix`       | Run ESLint with auto-fix                                                                                |
| `pnpm format`         | Format source files with Prettier                                                                       |
| `pnpm format:check`   | Check formatting without writing                                                                        |
| `pnpm gen:api`        | Regenerate `src/api/schema.d.ts` from `external/lume-model-api/openapi.json`                            |
| `pnpm gen:canopy-api` | Regenerate `src/api/canopy/schema.d.ts` from the running compose `canopy` service's Hare OpenAPI schema |

### LUME model API

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

### Canopy (Hare live PVs)

Live PV data comes from the Hare module of [Canopy](https://github.com/slaclab/canopy). Set
`VITE_CANOPY_API_BASE_URL` (default `http://localhost:8050`) and `VITE_CANOPY_API_KEY` (default
`dev`, sent as `X-API-Key`). The key ends up in the browser bundle, so only use a read-only key.
The Canopy code in `src/api/canopy/` follows the same three-layer pattern as the lume-model-api
code above: `getPv`/`describePv`, `hareKeys`/`hareQueries`, and the hooks in
`src/hooks/useHare.ts`. Errors are thrown as the same `LumeApiError`.

```tsx
const { data: meta } = usePvMeta('TEST:SINE'); // units, precision, limits, enum labels
const { data: pv } = usePv('TEST:SINE', { refetchInterval: 1000 }); // value, severity, tsNs
```

## Docker

Run the Vite dev server with hot reloading at `http://localhost:5173`:

```sh
docker compose up
```

The project directory is bind-mounted into the container, and `node_modules` lives in a Docker volume so it doesn't conflict with your host install. Dependencies are re-synced from the lockfile each time the container starts.

`docker compose up` also starts `lume-model-api` from `external/lume-model-api` at `http://localhost:8000` (Swagger UI at `/docs`). It hosts the lightweight `demo` model with synthetic live inputs, and reloads when you edit `external/lume-model-api/lume_model_api/`. The dashboard calls it at `http://localhost:8000` by default.

`docker compose up` also starts Canopy from `external/canopy` at `http://localhost:8050` (Swagger UI at `/docs`). It runs the API only (no Postgres, Redis or worker), which is all Hare needs, and reloads when you edit `external/canopy/src/`. The EPICS backend is simulated, so any PV name returns synthetic data. The name's suffix picks the value kind: `:ENUM`, `:WF`, `:STR`, `:TABLE`, and anything else is a scalar sine wave. Prefix a name with `pva://` to use PV Access. The service accepts one read-only, Hare-only API key, `dev`:

```sh
curl -H "X-API-Key: dev" http://localhost:8050/hare/v1/pvs/TEST:SINE
```

If port 8050 is taken, set `CANOPY_HOST_PORT` for compose and point `VITE_CANOPY_API_BASE_URL` at the new port.

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

The `canopy` image is built for `linux/amd64` because PyPI has no Linux arm64 wheels for `p4p`/`pvxslibs`, and the versions built from source don't match ("PVXS ABI mismatch"), so the `epics` backend can't start. On Apple Silicon it runs under emulation.

To run the real `cu_hxr_staged` model as well, built from the upstream Dockerfile (Bmad and torch, amd64 only, so it is slow under emulation on Apple Silicon), serve it at `http://localhost:8001` and set `VITE_LUME_API_BASE_URL=http://localhost:8001` in `.env.local`:

```sh
docker compose --profile full up --build
```

`Dockerfile` is for local development only. The production image used by Kubernetes is built from `Dockerfile.prod` (static build served by unprivileged nginx on port 8080, with a health check at `/healthz`).

To run the production image locally via compose (served at `http://localhost:8080`):

```sh
docker compose --profile prod up --build
```

The production image is built for the `/lume-visual-dashboard/` URL path by default. Override `BASE_PATH` to serve it from the root when running it standalone:

```sh
docker build -f Dockerfile.prod --build-arg BASE_PATH=/ -t lume-visual-dashboard .
docker run --rm -p 8080:8080 lume-visual-dashboard
```

## Kubernetes

Manifests live in `deploy/kubernetes` and are managed with Kustomize:

- `base/`: Namespace, Deployment, Service, and Ingress serving the app at `/lume-visual-dashboard`
- `overlays/staging/`: staging on the dev cluster. Swaps the ingress host to the dev domain and pins the image tag built from the `staging` branch.
- `overlays/prod/`: prod cluster. Pins the image tag built from `main`.

| Environment | Branch    | Overlay            | URL                                                                       |
| ----------- | --------- | ------------------ | ------------------------------------------------------------------------- |
| Staging     | `staging` | `overlays/staging` | `https://ad-accel-online-ml-dev.slac.stanford.edu/lume-visual-dashboard/` |
| Prod        | `main`    | `overlays/prod`    | `https://ard-modeling-service.slac.stanford.edu/lume-visual-dashboard/`   |

Both hosts are reachable from the SLAC network only (see the ingress allowlist in `base/ingress.yaml`).

Images are built from `Dockerfile.prod` and pushed to `ghcr.io/slaclab/lume-visual-dashboard` by the **Update Docker Image** workflow. It runs on every push to `main` or `staging`, except pushes that only change `deploy/`, `docs/`, or Markdown. Each build is tagged with the 7-character commit SHA, and the workflow commits that tag to the matching overlay (`main` → `overlays/prod`, `staging` → `overlays/staging`) on the same branch. Argo CD (configured in [slaclab/ad-argocd-apps](https://github.com/slaclab/ad-argocd-apps)) syncs each overlay from git automatically, so pushing to a branch is a deploy.

To deploy a change to staging, merge it into `staging`. Once it has been verified there, merge it into `main` for prod.

You can also run the workflow manually from another branch. It pushes an image tagged `latest`, or with the tag you enter, and it doesn't update either overlay.

To preview or apply manually instead:

```sh
kubectl kustomize deploy/kubernetes/overlays/staging   # preview staging
kubectl kustomize deploy/kubernetes/overlays/prod      # preview prod
kubectl apply -k deploy/kubernetes/overlays/prod
```

The ingress strips the `/lume-visual-dashboard` prefix before forwarding to nginx, so if the path changes, update both the ingress and the `BASE_PATH` build arg in `Dockerfile.prod`.

## Documentation

The `docs/` directory contains a [Zensical](https://zensical.org) documentation site. To preview it locally:

```sh
uv sync
uv run zensical serve
```

Docs are automatically built and deployed to GitHub Pages on pushes to `main`.

## CI

Three GitHub Actions workflows run on pull requests and pushes to `main`:

- **Lint & Format** — ESLint, Prettier, and TypeScript type-check
- **Test** — Vitest test suite
- **Build & Deploy Documentation** — builds the Zensical docs site and deploys to GitHub Pages
