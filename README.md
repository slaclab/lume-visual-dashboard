# LUME Visual Dashboard

A React dashboard for visualizing [LUME](https://github.com/slaclab/lume-model-api) accelerator models next to live machine data from [Canopy](https://github.com/slaclab/canopy).

**Documentation: <https://slaclab.github.io/lume-visual-dashboard/>**

The documentation covers development (routing, the data layers and live streams, local services) and deployment (Kubernetes, Canopy, secrets, CI). Its source is in [`docs/`](docs/).

## Stack

- **React 19**, **TypeScript** and **Vite**
- **TanStack Router** and **TanStack Query**, with API types generated from OpenAPI schemas
- **Carbon Design System** and **ECharts**
- **Vitest**, **React Testing Library** and **MSW**
- Docker Compose for local development, Kustomize and Argo CD for staging and prod

## Quick start

Requires [pnpm](https://pnpm.io/installation) and Docker.

```sh
git clone --recurse-submodules https://github.com/slaclab/lume-visual-dashboard.git
cd lume-visual-dashboard
pnpm install
docker compose up
```

Then open <http://localhost:5173>. Compose runs the Vite dev server, [lume-model-api](https://github.com/slaclab/lume-model-api) and Canopy, built from the git submodules in `external/`, with simulated machine data. If you cloned without `--recurse-submodules`, run `git submodule update --init` first.

See [Getting started](https://slaclab.github.io/lume-visual-dashboard/getting-started/) for configuration, submodules and running Vite outside Docker.

## Commands

| Command        | Description                                 |
| -------------- | ------------------------------------------- |
| `pnpm dev`     | Start the dev server at `localhost:5173`    |
| `pnpm build`   | Type-check and build for production         |
| `pnpm test`    | Run the tests once                          |
| `pnpm lint`    | Run ESLint                                  |
| `pnpm format`  | Format with Prettier                        |

The [full list](https://slaclab.github.io/lume-visual-dashboard/getting-started/#commands) includes the API type generators.

## Deployment

| Environment | Branch    | URL                                                                       |
| ----------- | --------- | ------------------------------------------------------------------------- |
| Staging     | `staging` | `https://ad-accel-online-ml-dev.slac.stanford.edu/lume-visual-dashboard/` |
| Prod        | `main`    | `https://ard-modeling-service.slac.stanford.edu/lume-visual-dashboard/`   |

Pushing to `staging` or `main` builds the image and deploys it through Argo CD. Both hosts are reachable from the SLAC network only. Some values are kept out of git and applied by hand; see [Secrets](https://slaclab.github.io/lume-visual-dashboard/deployment/secrets/) before the first deploy to a cluster. Everything else is under [Deployment](https://slaclab.github.io/lume-visual-dashboard/deployment/kubernetes/).

## Documentation

```sh
uv sync --group docs
uv run zensical serve
```

The site is published to GitHub Pages from `main`. See [Documentation](https://slaclab.github.io/lume-visual-dashboard/development/documentation/) for how to add pages.
