# Routing

Routes are files in `src/routes/` ([TanStack Router file-based routing](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing)).
The Vite plugin regenerates `src/routeTree.gen.ts` whenever `pnpm dev`, `pnpm build` or `pnpm test`
runs. That file is committed so `tsc` works on a fresh checkout. Don't edit it by hand.

| URL                            | File                                     | Purpose                                     |
| ------------------------------ | ---------------------------------------- | ------------------------------------------- |
| `/`                            | `routes/index.tsx`                       | Redirects to `/models`                      |
| `/models`                      | `routes/models/index.tsx`                | Model list                                  |
| `/models/:modelId`             | `routes/models/$modelId.tsx`             | Layout for a model: loads config, mode tabs |
| `/models/:modelId/`            | `routes/models/$modelId/index.tsx`       | Model config: inputs, outputs, screens      |
| `/models/:modelId/interactive` | `routes/models/$modelId/interactive.tsx` | Interactive mode                            |
| `/models/:modelId/streaming`   | `routes/models/$modelId/streaming.tsx`   | Streaming mode (lume-model-api live stream) |
| `/models/:modelId/canopy`      | `routes/models/$modelId/canopy.tsx`      | Streaming mode (Canopy Hare PVs)            |

To add a mode, create `src/routes/models/$modelId/<mode>.tsx` and add a `<Link>` for it in
`$modelId.tsx`. Loaders get the `queryClient` from router context (see `src/router.ts`), so they
prefetch with `queryClient.ensureQueryData(lumeQueries.…)` and components read the same cache
through the usual hooks. Files or folders starting with `-` in `src/routes/` are not treated as routes.

In development, the TanStack Router devtools (bottom-left) show the matched routes, params and
loader state, next to the TanStack Query devtools (bottom-right). Neither is included in production builds.

