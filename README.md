# LUME Visual Dashboard

A web dashboard for LCLS operators at SLAC. The dashboard provides an easy interface to watch live streaming predictions of these models, and use interactive controls to see the result of "what-if" scenarios. 

## Background

A set of *digital twins/virtual accelerators* of LCLS have been built that provide us an way to model the accelerator and connect these models to the control system in a seamless manner. [LUME](https://github.com/slaclab/lume) gives us the standard interface to multiple model types.

This project is the **frontend** to these models. A separate HTTPS service backend actually runs the models and sends the results to this app with the [lume-model-api](https://github.com/slaclab/lume-model-api).

## What this dashboard does

The dashboard has two modes. There are two tabs that show the same panels:

1. **Live (streaming) mode** - Shows live predictions from the models. This is also called "digital twin" or "shadow" mode.
2. **Interactive mode** - Operators move sliders to do "what-if" scenarios. The dashboard then shows what the beam and predictions would look like with the changes.

Switching between the two tabs should feel instant.

Demos of the earlier prototype we implemented:

- [React demo](https://ard-modeling-service.slac.stanford.edu/live-monitor/)
- [Trame demo](https://ard-modeling-service.slac.stanford.edu/lume-model-visual/index.html) (SLAC VPN needed)

## Key concept: variable types

LUME has a standard way to define model variables. There are three types. The type of a variable decides which charts can show it.

| Variable type | What it holds | Example |
|---|---|---|
| **Scalar** | One number | Beam size, magnet setting |
| **NDVariable** | An array | A 1D beta function along the beamline, a 2D screen image |
| **Particle group** | A full beam distribution (the openPMD-beamphysics standard) | Used for phase-space plots and beam summary values (size, emittance, energy, charge) |

### Chart types for each variable type

| Variable type | Available charts |
|---|---|
| Scalar | Value over time (live) or per evaluation (interactive); scalar vs scalar (for example beam size vs a magnet setting); list or table of values |
| NDVariable | 1D plot against another array (usually position *s* along the beamline) or against index; 2D image; table or matrix view |
| Particle group | 2D phase-space plot (any pair of x, px, y, py, z, pz); beam summary values as a list or over time |

## Planned features

The dashboard is customizable:

- **Variable menu** - Search for a variable. Filter by scalar, NDVariable, or particle group.
- **Chart-type menu** - Pick a chart type (scalar time series, 2D image, phase-space scatter, scalar vs *s*, and so on).
- **Grid** - The center of the page. Users drag items from the menus onto the grid, and move or resize the panels.
- **Save and restore** - Users save a custom dashboard layout and load it later.

If you pick a variable, the chart list shows only the charts that fit it. Each panel on the grid also has a dropdown to change the chart type among those that fit its variable.

### Main UI components

- **Beam distribution panel** - For one screen or diagnostic location on the beamline. Shows phase space, beam summary values, and the screen image. Some locations have no image, so the panel needs a way to show that.
- **Twiss / "vs s" panel** - Shows quantities along the beamline.
- **Time series panel** - Shows model predictions over time. Users can overlay a live machine reading to compare.
- **Inputs panel** - Sliders in interactive mode. Read-only live values in streaming mode.
- **Dashboard container** - The grid that holds the panels. It also does save and restore.

### Design constraints

- The dashboard runs in the control room on large screens. All panels must be visible **without scrolling**, and they must rescale with the window.
- Users must see whether each live input value was **read from the machine** or is a **fallback default**.
- Time-series plots fill up from the time the page opens. There is no stored history yet. The plots start empty, so they need a clear "collecting data" state.

## Status

The project is in early development.

The backend API is developed separately in the repo: [lume-model-api](https://github.com/slaclab/lume-model-api).

## Tech stack

- **React 19** with **TypeScript**
- **Vite** for the dev server and builds
- **Carbon Design System** for UI components
- **TanStack Router** and **TanStack Query** for routing and data fetching
- **ECharts** for charts
- **Vitest** + **React Testing Library** for tests
- **ESLint** + **Prettier** + **Husky** pre-commit hooks for code style
- **Zensical** (MkDocs-based) documentation site with GitHub Pages deployment
- GitHub Actions workflows for lint, type-check, test, and docs deployment

## Getting started

Install [pnpm](https://pnpm.io/installation). Then run:

```sh
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:5173`.

## Development

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server at `http://localhost:5173` |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with auto-fix |
| `pnpm format` | Format source files with Prettier |
| `pnpm format:check` | Check formatting without writing |

## Docker

Run the Vite dev server with hot reloading at `http://localhost:5173`:

```sh
docker compose up
```

The project directory is bind-mounted into the container, and `node_modules` lives in a Docker volume so it doesn't conflict with your host install. Dependencies are re-synced from the lockfile each time the container starts.

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

- `base/` — Namespace, Deployment, Service, and Ingress serving the app at `/lume-visual-dashboard`
- `overlays/dev/` — dev cluster (sets the dev domain, uses the `latest` image)
- `overlays/prod/` — prod cluster (pins a specific image tag)

Images are built from `Dockerfile.prod` and pushed to `ghcr.io/slaclab/lume-visual-dashboard` by the **Update Docker Image** workflow. It runs on every push to `main` (except changes limited to `deploy/`, `docs/`, or Markdown) and can also be run manually. Builds from `main` are tagged with the 7-character commit SHA, and the workflow commits that tag to `overlays/prod/kustomization.yaml`. Argo CD (configured in [slaclab/ad-argocd-apps](https://github.com/slaclab/ad-argocd-apps)) watches the prod overlay on `main` and syncs it to the cluster automatically.

To preview or apply manually instead:

```sh
kubectl kustomize deploy/kubernetes/overlays/prod   # preview
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
