# LUME Visual Dashboard

A React dashboard for visualizing LUME accelerator models.

## What's included

- **React 19** with **TypeScript**
- **Vite** for fast dev server and builds
- **TanStack Query** for fetching and caching lume-model-api data, with types generated from its OpenAPI schema
- **Carbon Design System** and **ECharts** for UI and plots
- **Vitest** + **React Testing Library** + **MSW** for unit/integration tests
- **ESLint** + **Prettier** + **Husky** pre-commit hooks for consistent code style
- **Zensical** (MkDocs-based) documentation site with GitHub Pages deployment
- GitHub Actions workflows for lint, type-check, test, docs deployment and image builds
- Docker Compose for local development and Kustomize manifests for staging and prod

## Getting started

### Clone the repository

```sh
git clone https://github.com/slaclab/lume-visual-dashboard.git
cd lume-visual-dashboard
```

The local API service in `compose.yaml` and `pnpm gen:api` both expect a checkout of
lume-model-api in `external/lume-model-api`:

```sh
git clone https://github.com/slaclab/lume-model-api.git external/lume-model-api
```

### Install dependencies

Requires [pnpm](https://pnpm.io/installation).

```sh
pnpm install
```

## Development

| Command              | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`           | Start dev server at `http://localhost:5173`                                  |
| `pnpm build`         | Type-check and build for production                                          |
| `pnpm preview`       | Preview production build locally                                             |
| `pnpm test`          | Run tests once                                                               |
| `pnpm test:watch`    | Run tests in watch mode                                                      |
| `pnpm test:coverage` | Run tests with coverage report                                               |
| `pnpm lint`          | Run ESLint                                                                   |
| `pnpm lint:fix`      | Run ESLint with auto-fix                                                     |
| `pnpm format`        | Format source files with Prettier                                            |
| `pnpm format:check`  | Check formatting without writing                                             |
| `pnpm gen:api`       | Regenerate `src/api/schema.d.ts` from `external/lume-model-api/openapi.json` |

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

## Docker

Run the Vite dev server with hot reloading at `http://localhost:5173`:

```sh
docker compose up
```

The project directory is bind-mounted into the container, and `node_modules` lives in a Docker volume so it doesn't conflict with your host install. Dependencies are re-synced from the lockfile each time the container starts.

`docker compose up` also starts `lume-model-api` from `external/lume-model-api` at `http://localhost:8000` (Swagger UI at `/docs`). It hosts the lightweight `demo` model with synthetic live inputs, and reloads when you edit `external/lume-model-api/lume_model_api/`. The dashboard calls it at `http://localhost:8000` by default.

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
