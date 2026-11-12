# Kubernetes

Manifests live in `deploy/kubernetes` and are managed with Kustomize:

- `base/`: the dashboard's Namespace, Deployment, Service and Ingress (serving the app at `/lume-visual-dashboard`), its `dashboard-config` ConfigMap, and [Canopy](canopy.md). The Secrets aren't in git; see [Secrets](secrets.md).
- `overlays/staging/`: staging on the dev cluster. Swaps the ingress hosts to the dev domain, sets the staging API URLs in `config.js`, and pins the image tags built from the `staging` branch.
- `overlays/prod/`: prod cluster. Sets the prod API URLs in `config.js` and pins the image tags built from `main`.

| Environment | Branch    | Overlay            | URL                                                                       |
| ----------- | --------- | ------------------ | ------------------------------------------------------------------------- |
| Staging     | `staging` | `overlays/staging` | `https://ad-accel-online-ml-dev.slac.stanford.edu/lume-visual-dashboard/` |
| Prod        | `main`    | `overlays/prod`    | `https://ard-modeling-service.slac.stanford.edu/lume-visual-dashboard/`   |

Both hosts are reachable from the SLAC network only (see the ingress allowlist in `base/ingress.yaml`).

## Deploying

Argo CD (configured in [slaclab/ad-argocd-apps](https://github.com/slaclab/ad-argocd-apps)) syncs each overlay from git automatically, so pushing to a branch is a deploy. To deploy a change to staging, merge it into `staging`. Once it has been verified there, merge it into `main` for prod. The **Update Docker Image** workflow builds the image and commits its tag to the overlay; see [CI and image builds](ci.md).

To preview or apply manually instead:

```sh
kubectl kustomize deploy/kubernetes/overlays/staging   # preview staging
kubectl kustomize deploy/kubernetes/overlays/prod      # preview prod
kubectl apply -k deploy/kubernetes/overlays/prod
```

The ingress strips the `/lume-visual-dashboard` prefix before forwarding to nginx, so if the path changes, update both the ingress and the `BASE_PATH` build arg in `Dockerfile.prod`.

## API URLs per environment

The image doesn't bake in API URLs. Each overlay's `config.js` becomes the `dashboard-config` ConfigMap, which is mounted over the image's `/config.js`. `index.html` loads it before the app starts. To point an environment at a different API, edit its `config.js` and push. Changes under `deploy/` don't trigger an image build, and the content-hashed ConfigMap name rolls the pod.

| Key                | Staging                                                           | Prod                                                                               |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `lumeApiBaseUrl`   | `https://ad-accel-online-ml-dev.slac.stanford.edu/lume-model-api` | `https://ard-modeling-service.slac.stanford.edu/lume-model-api` (not deployed yet) |
| `canopyApiBaseUrl` | `https://ad-accel-online-ml-dev.slac.stanford.edu/lume-canopy`    | `https://ard-modeling-service.slac.stanford.edu/lume-canopy`                       |
| `canopyApiKey`     | from `canopy-key.js` ([Secret](secrets.md))                       | from `canopy-key.js` ([Secret](secrets.md))                                        |

`canopyApiBaseUrl: null` turns the Canopy page off: it says Canopy isn't configured instead of connecting.

The repo is public and `config.js` is served to every browser, so everything committed under `deploy/` must be public. `canopyApiKey` is set by a second file, `canopy-key.js`, which `index.html` loads after `config.js` and which is mounted from a [Secret](secrets.md).

Unset keys fall back to the `VITE_*` build-time variables, then to the local docker compose defaults. Locally, `public/config.js` and `public/canopy-key.js` are empty, so `.env.local` still applies.
