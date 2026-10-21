# EED SWApps React Template

A template repository for React projects in the EED Software Applications Group at SLAC National Accelerator Laboratory.

## What's included

- **React 19** with **TypeScript**
- **Vite** for fast dev server and builds
- **Vitest** + **React Testing Library** for unit/integration tests
- **ESLint** + **Prettier** + **Husky** pre-commit hooks for consistent code style
- **Zensical** (MkDocs-based) documentation site with GitHub Pages deployment
- GitHub Actions workflows for lint, type-check, test, and docs deployment

## Getting started

### Create a new project from this template

Click **Use this template** on GitHub, or clone and reinitialize:

```sh
git clone https://github.com/slaclab/swapps-react-template.git my-app
cd my-app
git remote remove origin
```

### After cloning, update the project name

1. `package.json` — update `name` and `description`
2. `index.html` — update `<title>`
3. `pyproject.toml` — update `name` and `description`
4. `zensical.toml` — update `site_name`, `site_description`, `repo_name`, `repo_url`, and the social link

### Install dependencies

Requires [pnpm](https://pnpm.io/installation).

```sh
pnpm install
```

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
