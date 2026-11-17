# CI and image builds

## Checks

These GitHub Actions workflows run on pull requests to `main` and pushes to `main`:

| Workflow                         | File              | What it does                                                                                                                  |
| -------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Check**                        | `check.yml`       | ESLint, Prettier and the TypeScript type-check                                                                                |
| **Test**                         | `test.yml`        | The Vitest suite                                                                                                              |
| **Build & Deploy Documentation** | `gh-pages.yml`    | Builds this site with `zensical build --strict` on pull requests that touch the docs, and publishes it to GitHub Pages from `main` |

Check and Test first check out the `external/swapps-design-system` submodule (only that one), because the app compiles `@swapps/ui` from its source; see [Design system](../development/design-system.md).

## Image builds

The **Update Docker Image** workflow (`update-image.yaml`) checks out the `external/swapps-design-system` submodule, then builds `Dockerfile.prod` and pushes it to `ghcr.io/slaclab/lume-visual-dashboard`. It runs on every push to `main` or `staging`, except pushes that only change `deploy/`, `docs/`, or Markdown.

Each build is tagged with the 7-character commit SHA. The workflow then commits two tags to the matching overlay (`main` → `overlays/prod`, `staging` → `overlays/staging`) on the same branch:

- the dashboard image's new tag
- the [Canopy](canopy.md) image tag, taken from the commit the `external/canopy` submodule points at. The workflow fails before pushing anything if upstream has no image for that commit.

Argo CD then deploys the overlay; see [Kubernetes](kubernetes.md#deploying).

You can also run the workflow manually from another branch. It pushes an image tagged `latest`, or with the tag you enter, and it doesn't update either overlay.
