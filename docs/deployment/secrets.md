# Secrets

Why these values aren't in git, and why the read token is still visible in the browser, is covered under [Canopy](canopy.md#api-keys).

The Canopy read key and the EPICS gateway addresses stay out of git. Each cluster gets two Secrets in the `lume-visual-dashboard` namespace, defined in `overlays/<env>/secrets.yaml`. Staging and prod have separate files with their own values (token, EPICS gateways). The Secret names are the same in both, because the shared `base/` manifests refer to them by name. Which cluster you apply a file to is what keeps the environments apart. That file is gitignored. Copy it from [`deploy/kubernetes/secrets.example.yaml`](https://github.com/slaclab/lume-visual-dashboard/blob/main/deploy/kubernetes/secrets.example.yaml):

| Secret                             | Used by                                       | Holds                                                                       |
| ---------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `lume-canopy-env`                  | `lume-canopy`, as env vars                    | `CANOPY_API_KEYS` (`<READ_TOKEN>:read@hare`), `EPICS_CA_ADDR_LIST`, `EPICS_PVA_ADDR_LIST` |
| `lume-visual-dashboard-canopy-key` | `lume-visual-dashboard`, as `canopy-key.js`   | the same `<READ_TOKEN>`, as `canopyApiKey`                                  |

1. Generate a token per cluster. Don't prefix it with `cnpy_`, which Canopy reserves for database-issued keys:

   ```sh
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. Fill in `overlays/<env>/secrets.yaml`. The token goes in both Secrets. The EPICS lists are space-separated `host[:port]` gateways reachable from that cluster. Pod networking can't carry broadcast discovery, so `base/canopy.yaml` sets `*_AUTO_ADDR_LIST=NO`.
3. Apply each file to its own cluster, naming the context explicitly, before pushing the overlay that needs it. A file applied to the wrong cluster overwrites that cluster's Secrets. Both Deployments mount these Secrets, so a new pod waits in `ContainerCreating` until they exist, while the old pod keeps serving:

   ```sh
   kubectl config get-contexts   # find each cluster's context
   kubectl --context <dev-cluster-context>  apply -f deploy/kubernetes/overlays/staging/secrets.yaml
   kubectl --context <prod-cluster-context> apply -f deploy/kubernetes/overlays/prod/secrets.yaml
   ```

4. After changing a value later, restart both Deployments. Neither picks up a changed Secret on its own: Canopy reads env vars at startup, and the dashboard mounts the file with `subPath`.

   ```sh
   kubectl --context <cluster-context> -n lume-visual-dashboard rollout restart deployment/lume-canopy deployment/lume-visual-dashboard
   ```

Argo CD doesn't manage these Secrets, so it neither overwrites nor prunes them. The read token is still visible to anyone who can open the dashboard, so keep it `read@hare`. The Secret only keeps it out of git.

