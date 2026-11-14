---
icon: lucide/house
---

# LUME Visual Dashboard

A React dashboard for visualizing [LUME](https://github.com/slaclab/lume-model-api) accelerator models next to live machine data.

It talks to two backends, both called directly from the browser:

| Backend                                                          | Provides                                                                                     | Code               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| [lume-model-api](https://github.com/slaclab/lume-model-api)      | The model list, each model's config, evaluate, and a live stream of the model run at the machine's current inputs | `src/api/`         |
| [Canopy](https://github.com/slaclab/canopy) (its Hare module)    | Live EPICS PV values and metadata over REST and a WebSocket                                  | `src/api/canopy/`  |

Both are git submodules in `external/`, and `compose.yaml` runs them locally with simulated machine data.

## Where to start

- **New to the project:** [Getting started](getting-started.md) covers cloning, installing, running everything locally, and the `pnpm` commands.
- **Working on the app:**
    - [Routing](development/routing.md): URLs, route files, and adding a mode.
    - [lume-model-api](development/lume-model-api.md) and [Canopy](development/canopy.md): the data layers, hooks, and live streams.
    - [Choosing a stream](development/streams.md): which stream a view should use.
    - [Local services](development/local-services.md): the Docker Compose services, and reading from a real IOC.
- **Deploying:**
    - [Kubernetes](deployment/kubernetes.md): environments, overlays, and runtime config.
    - [Canopy in the cluster](deployment/canopy.md) and [Secrets](deployment/secrets.md): the Canopy service, its API key, and the values kept out of git.
    - [CI and image builds](deployment/ci.md): checks, image builds, and how tags reach the overlays.
- **Editing these docs:** [Documentation](development/documentation.md).

## Stack

- **React 19** with **TypeScript**, built with **Vite**
- **TanStack Router** for file-based, type-safe routing (each model and mode has its own URL)
- **TanStack Query** for fetching and caching, with types generated from each API's OpenAPI schema
- **Carbon Design System** and **ECharts** for UI and plots
- **Vitest**, **React Testing Library** and **MSW** for tests
- **ESLint**, **Prettier** and **Husky** pre-commit hooks
