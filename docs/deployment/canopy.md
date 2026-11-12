# Canopy in the cluster

`base/canopy.yaml` runs [Canopy](https://github.com/slaclab/canopy) next to the dashboard, in the same namespace, the same way `compose.yaml` does: only the API process, which is all Hare needs, with no Postgres, Redis or worker. It uses the real EPICS backend, reading through the gateways listed in its [Secret](secrets.md). `base/canopy-ingress.yaml` serves it at `/lume-canopy` on the dashboard's host, strips the prefix, and allows long-lived Hare WebSockets.

## Image

The image is upstream's `ghcr.io/slaclab/canopy:<short-sha>`, which slaclab/canopy's CI publishes for each `main` commit. The **Update Docker Image** workflow sets the Canopy tag in the overlay to the commit the `external/canopy` submodule points at. To upgrade Canopy in an environment, bump the submodule on `staging` or `main` and push. The workflow fails before pushing anything if upstream has no image for that commit. See [CI and image builds](ci.md).

## No database

Canopy runs without a database. Postgres only backs the modules the dashboard doesn't use (Squirrel, Magpie, Jobs) and database-issued API keys. Hare never touches it, and the other modules only connect when one of their own endpoints is called.

Add Postgres (`CANOPY_DATABASE_URL` in the Secret plus an `alembic upgrade head` step) only if you need per-app keys, revocation without a restart, or another Canopy module.

## API keys

Canopy checks a token in two places, in order:

1. **`CANOPY_API_KEYS`**, read into memory at startup. A listed token is let through, with its scope and module (`read@hare`) still enforced. This is the only place this deployment has keys.
2. **The Postgres key store**, used only when step 1 finds no match. Any token not shaped like a database-issued key (`cnpy_` followed by 43 characters) gets a `401` without contacting a database. A `cnpy_` token gets a fast `503 key_store_unavailable`, since there's no database to ask.

So there's no admin key and no `create_key.py`: changing the key means editing the [Secret](secrets.md) and restarting.

!!! warning "The read token is visible in the browser"
    The dashboard calls Canopy from the browser, so anyone who can open it can read the token: in `canopy-key.js`, in the `X-API-Key` header, and in the WebSocket URL (`?api_key=`, since browsers can't set headers on a WebSocket). No front-end obfuscation can hide it. The Secret only keeps it out of git and the image.

    What protects Canopy is the ingress IP allowlist (SLAC networks only), the key being read-only and limited to Hare, and a separate token per cluster. To hide the token, the dashboard's nginx would have to proxy Canopy and add the key itself. To limit who can read PVs, the dashboard needs user login in front of it.

## Verifying

```sh
curl https://<host>/lume-canopy/health
curl -H "X-API-Key: <READ_TOKEN>" https://<host>/lume-canopy/hare/v1/pvs/<PV>
```

Swagger is at `/lume-canopy/docs`. The Canopy page in the dashboard shows whether Hare is on the `epics` or `simulation` backend.
