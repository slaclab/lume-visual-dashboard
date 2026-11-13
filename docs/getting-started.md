---
icon: lucide/rocket
---

# Getting started

## Clone the repository

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

## Install dependencies

Requires [pnpm](https://pnpm.io/installation).

```sh
pnpm install
```

## Run the dashboard

The dashboard needs lume-model-api, and Canopy for live PVs. Docker Compose runs both, with simulated machine data, alongside the Vite dev server:

```sh
docker compose up
```

Open `http://localhost:5173`. See [Local services](development/local-services.md) for what each service runs, how to read from a real IOC, and how to try the production image.

To run Vite on your machine instead, start just the APIs with `docker compose up lume-model-api canopy`, then run `pnpm dev`.

## Configuration

Locally, the dashboard reads its API URLs from Vite variables. Copy `.env.example` to `.env.local` and uncomment what you need:

| Variable                   | Default                 | Purpose                                                       |
| -------------------------- | ----------------------- | ------------------------------------------------------------- |
| `VITE_LUME_API_BASE_URL`   | `http://localhost:8000` | lume-model-api, including any ingress prefix                  |
| `VITE_CANOPY_API_BASE_URL` | `http://localhost:8050` | Canopy                                                        |
| `VITE_CANOPY_API_KEY`      | `dev`                   | Canopy key, sent from the browser, so use a read-only key     |

Deployments set these at runtime instead; see [Kubernetes](deployment/kubernetes.md#api-urls-per-environment).

## Commands

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
